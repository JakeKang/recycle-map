import { createClient } from "@supabase/supabase-js";

import { buildClientHeaders, buildClientJsonHeaders } from "@/lib/client-dev-user";

interface UploadedPhoto {
  id: string;
  readUrl: string;
  name: string;
}

async function responseError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: unknown };
    if (typeof payload.message === "string") {
      return new Error(payload.message);
    }
  } catch {
    // Use the stable fallback below.
  }
  return new Error(fallback);
}

export async function uploadPointPhoto(
  sourceFile: File,
  optimizedFile: File,
): Promise<UploadedPhoto> {
  if (process.env.NEXT_PUBLIC_UPLOAD_STORAGE_MODE !== "supabase") {
    const formData = new FormData();
    formData.append("file", optimizedFile);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: buildClientHeaders(),
      body: formData,
    });
    if (!response.ok) {
      throw await responseError(response, "이미지 업로드에 실패했습니다.");
    }
    return (await response.json()) as UploadedPhoto;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("업로드 저장소 설정이 누락되었습니다.");
  }

  const intentResponse = await fetch("/api/upload/intent", {
    method: "POST",
    headers: buildClientJsonHeaders(),
    body: JSON.stringify({
      originalName: sourceFile.name,
      mimeType: optimizedFile.type,
      sourceSize: sourceFile.size,
      storedSize: optimizedFile.size,
    }),
  });
  if (!intentResponse.ok) {
    throw await responseError(intentResponse, "업로드 준비에 실패했습니다.");
  }
  const intent = (await intentResponse.json()) as {
    id: string;
    bucket: string;
    path: string;
    token: string;
  };

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: uploadError } = await client.storage
    .from(intent.bucket)
    .uploadToSignedUrl(intent.path, intent.token, optimizedFile, {
      contentType: optimizedFile.type,
      upsert: false,
    });
  if (uploadError) {
    throw new Error("이미지 저장소 업로드에 실패했습니다.");
  }

  const completionResponse = await fetch(`/api/upload/${intent.id}/complete`, {
    method: "POST",
    headers: buildClientHeaders(),
  });
  if (!completionResponse.ok) {
    throw await responseError(completionResponse, "업로드 검증에 실패했습니다.");
  }
  return (await completionResponse.json()) as UploadedPhoto;
}
