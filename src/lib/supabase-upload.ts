import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import {
  ALLOWED_IMAGE_MIME_TYPES,
  LocalStorageError,
  validateImageBytes,
} from "@/lib/local-file-storage";
import {
  MAX_SOURCE_IMAGE_BYTES,
  MAX_STORED_IMAGE_BYTES,
} from "@/lib/image-upload-policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptSensitiveText, encryptSensitiveText } from "@/lib/sensitive-data";

export const POINT_PHOTO_BUCKET = "point-photos";

interface UploadIntentInput {
  originalName: string;
  mimeType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
  sourceSize: number;
  storedSize: number;
}

function requireClient() {
  const client = createSupabaseServerClient();
  if (!client) {
    throw new LocalStorageError("운영 업로드 저장소가 설정되지 않았습니다.", 503);
  }
  return client;
}

function sanitizeOriginalName(filename: string) {
  const baseName = path.basename(filename || "image");
  return baseName.replace(/[\u0000-\u001f\u007f]/g, "_").slice(0, 120) || "image";
}

async function ensureProfile(userId: string) {
  const client = requireClient();
  const { error } = await client.from("profiles").upsert(
    { id: userId, nickname: "사용자", provider: "nextauth" },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
  return client;
}

export async function createSupabaseUploadIntent(userId: string, input: UploadIntentInput) {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(input.mimeType) ||
    input.sourceSize < 1 ||
    input.sourceSize > MAX_SOURCE_IMAGE_BYTES ||
    input.storedSize < 1 ||
    input.storedSize > MAX_STORED_IMAGE_BYTES
  ) {
    throw new LocalStorageError("업로드 파일 정책을 충족하지 않습니다.", 400);
  }

  const client = await ensureProfile(userId);
  const { data: expiredUploads } = await client
    .from("app_uploads")
    .select("id,object_path")
    .eq("owner_id", userId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .limit(20);
  if (expiredUploads && expiredUploads.length > 0) {
    const { error: removeError } = await client.storage
      .from(POINT_PHOTO_BUCKET)
      .remove(expiredUploads.map((item) => item.object_path));
    if (removeError) throw removeError;
    const { error: deleteError } = await client
      .from("app_uploads")
      .delete()
      .in("id", expiredUploads.map((item) => item.id));
    if (deleteError) throw deleteError;
  }

  const id = randomUUID();
  const ownerPath = createHash("sha256").update(userId).digest("hex").slice(0, 32);
  const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType.split("/")[1];
  const objectPath = `${ownerPath}/${id}.${extension}`;

  const { error: insertError } = await client.from("app_uploads").insert({
    id,
    owner_id: userId,
    object_path: objectPath,
    original_name: encryptSensitiveText(sanitizeOriginalName(input.originalName)),
    mime_type: input.mimeType,
    declared_size: input.sourceSize,
    stored_size: input.storedSize,
    status: "pending",
  });
  if (insertError) throw insertError;

  const { data, error } = await client.storage
    .from(POINT_PHOTO_BUCKET)
    .createSignedUploadUrl(objectPath);
  if (error || !data) {
    await client.from("app_uploads").delete().eq("id", id);
    throw error ?? new Error("Failed to create signed upload URL");
  }

  return {
    id,
    bucket: POINT_PHOTO_BUCKET,
    path: data.path,
    token: data.token,
  };
}

async function rejectUpload(id: string, objectPath: string) {
  const client = requireClient();
  const { error: updateError } = await client
    .from("app_uploads")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw updateError;
  const { error: removeError } = await client.storage
    .from(POINT_PHOTO_BUCKET)
    .remove([objectPath]);
  if (removeError) throw removeError;
}

export async function completeSupabaseUpload(userId: string, id: string) {
  const client = requireClient();
  const { data: upload, error: uploadError } = await client
    .from("app_uploads")
    .select("id,owner_id,object_path,original_name,mime_type,stored_size,status")
    .eq("id", id)
    .eq("owner_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (uploadError) throw uploadError;
  if (!upload) throw new LocalStorageError("업로드 요청을 찾을 수 없습니다.", 404);

  const storage = client.storage.from(POINT_PHOTO_BUCKET);
  const { data: info, error: infoError } = await storage.info(upload.object_path);
  if (
    infoError ||
    !info ||
    typeof info.size !== "number" ||
    info.size !== upload.stored_size ||
    info.size > MAX_STORED_IMAGE_BYTES ||
    info.contentType !== upload.mime_type
  ) {
    await rejectUpload(id, upload.object_path);
    throw new LocalStorageError("업로드된 객체 정보가 요청과 일치하지 않습니다.", 400);
  }

  const { data: blob, error: downloadError } = await storage.download(upload.object_path);
  if (downloadError || !blob) {
    await rejectUpload(id, upload.object_path);
    throw new LocalStorageError("업로드된 이미지를 검증할 수 없습니다.", 400);
  }
  const buffer = Buffer.from(await blob.arrayBuffer());
  try {
    validateImageBytes(buffer, upload.mime_type);
  } catch (error) {
    await rejectUpload(id, upload.object_path);
    throw error;
  }
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const { error: updateError } = await client
    .from("app_uploads")
    .update({ status: "ready", sha256, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId);
  if (updateError) throw updateError;

  return {
    id,
    name: decryptSensitiveText(upload.original_name),
    mimeType: upload.mime_type,
    size: info.size,
  };
}

export async function createSupabasePhotoReadUrl(
  fileId: string,
  userId: string | null,
  download: boolean,
) {
  const client = requireClient();
  const { data: upload, error } = await client
    .from("app_uploads")
    .select("owner_id,object_path,original_name,mime_type,stored_size,status")
    .eq("id", fileId)
    .maybeSingle();
  if (error) throw error;
  if (!upload) return null;
  if (upload.status !== "attached" && upload.owner_id !== userId) {
    throw new LocalStorageError("파일 접근 권한이 없습니다.", 403);
  }

  const { data, error: signedError } = await client.storage
    .from(POINT_PHOTO_BUCKET)
    .createSignedUrl(upload.object_path, 60, {
      download: download ? decryptSensitiveText(upload.original_name) : false,
    });
  if (signedError || !data) throw signedError ?? new Error("Failed to sign file URL");
  return data.signedUrl;
}
