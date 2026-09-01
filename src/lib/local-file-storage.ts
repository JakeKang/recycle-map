import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
  MAX_STORED_IMAGE_BYTES,
} from "@/lib/image-upload-policy";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = MAX_STORED_IMAGE_BYTES;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIME_EXTENSION_MAP: Record<(typeof ALLOWED_IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const attachingFileIds = new Set<string>();

export class LocalStorageError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LocalStorageError";
    this.status = status;
  }
}

export interface LocalStoredFileMeta {
  id: string;
  ownerId: string;
  originalName: string;
  storedName: string;
  mimeType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
  size: number;
  createdAt: string;
  status?: "ready" | "attached";
  pointId?: string;
}

function getStorageRootDir() {
  const configured = process.env.LOCAL_STORAGE_ROOT_DIR;
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured);
  }

  return path.resolve(process.cwd(), "data");
}

function getUploadDir() {
  return path.join(getStorageRootDir(), "uploads");
}

function getMetaDir() {
  return path.join(getStorageRootDir(), "upload-meta");
}

/** 경로 순회(path traversal) 공격 방지 — 파일 접근이 반드시 base 디렉터리 내부로 제한되어야 함 */
function ensureInsideBase(base: string, target: string) {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)
  ) {
    throw new LocalStorageError("잘못된 파일 경로입니다.", 400);
  }
}

function sanitizeOriginalName(filename: string) {
  const baseName = path.basename(filename || "upload");
  const normalized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const trimmed = normalized.replace(/_+/g, "_").slice(0, 120);
  return trimmed.length > 0 ? trimmed : "upload";
}

function validateFileId(fileId: string) {
  if (!UUID_PATTERN.test(fileId)) {
    throw new LocalStorageError("잘못된 파일 식별자입니다.", 400);
  }
}

async function ensureStorageDirectories() {
  await mkdir(getUploadDir(), { recursive: true });
  await mkdir(getMetaDir(), { recursive: true });
}

function toStoredName(fileId: string, mimeType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number]) {
  const extension = MIME_EXTENSION_MAP[mimeType];
  return `${fileId}${extension}`;
}

function getMetaPath(fileId: string) {
  const metaPath = path.join(getMetaDir(), `${fileId}.json`);
  ensureInsideBase(getMetaDir(), metaPath);
  return metaPath;
}

function getFilePath(storedName: string) {
  if (!/^[0-9a-f-]+\.(jpg|png|webp)$/i.test(storedName)) {
    throw new LocalStorageError("손상된 파일 정보입니다.", 500);
  }

  const filePath = path.join(getUploadDir(), storedName);
  ensureInsideBase(getUploadDir(), filePath);
  return filePath;
}

/** 파일 매직 바이트로 실제 이미지 형식 검증 — Content-Type 헤더 위변조 방지 */
function detectImageMimeType(
  fileBuffer: Buffer,
): (typeof ALLOWED_IMAGE_MIME_TYPES)[number] | null {
  if (
    fileBuffer.length >= 3 &&
    fileBuffer[0] === 0xff &&
    fileBuffer[1] === 0xd8 &&
    fileBuffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    fileBuffer.length >= 8 &&
    fileBuffer[0] === 0x89 &&
    fileBuffer[1] === 0x50 &&
    fileBuffer[2] === 0x4e &&
    fileBuffer[3] === 0x47 &&
    fileBuffer[4] === 0x0d &&
    fileBuffer[5] === 0x0a &&
    fileBuffer[6] === 0x1a &&
    fileBuffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    fileBuffer.length >= 12 &&
    fileBuffer.toString("ascii", 0, 4) === "RIFF" &&
    fileBuffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function readJpegDimensions(fileBuffer: Buffer) {
  let offset = 2;
  while (offset + 8 < fileBuffer.length) {
    if (fileBuffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = fileBuffer[offset + 1];
    const segmentLength = fileBuffer.readUInt16BE(offset + 2);
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker,
      ) &&
      offset + 8 < fileBuffer.length
    ) {
      return {
        height: fileBuffer.readUInt16BE(offset + 5),
        width: fileBuffer.readUInt16BE(offset + 7),
      };
    }

    if (segmentLength < 2) {
      break;
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function readWebpDimensions(fileBuffer: Buffer) {
  const chunk = fileBuffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && fileBuffer.length >= 30) {
    return {
      width: 1 + fileBuffer.readUIntLE(24, 3),
      height: 1 + fileBuffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 " && fileBuffer.length >= 30) {
    return {
      width: fileBuffer.readUInt16LE(26) & 0x3fff,
      height: fileBuffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && fileBuffer.length >= 25) {
    const bits = fileBuffer.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  return null;
}

function readImageDimensions(
  fileBuffer: Buffer,
  mimeType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
) {
  if (mimeType === "image/png" && fileBuffer.length >= 24) {
    return {
      width: fileBuffer.readUInt32BE(16),
      height: fileBuffer.readUInt32BE(20),
    };
  }
  if (mimeType === "image/jpeg") {
    return readJpegDimensions(fileBuffer);
  }
  if (mimeType === "image/webp") {
    return readWebpDimensions(fileBuffer);
  }
  return null;
}

function hasSensitiveMetadata(
  fileBuffer: Buffer,
  mimeType: (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
) {
  if (mimeType === "image/jpeg") {
    let offset = 2;
    while (offset + 4 <= fileBuffer.length) {
      if (fileBuffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = fileBuffer[offset + 1];
      if (marker === 0xe1 || marker === 0xed) return true;
      const length = fileBuffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += length + 2;
    }
  }

  if (mimeType === "image/png") {
    let offset = 8;
    while (offset + 12 <= fileBuffer.length) {
      const length = fileBuffer.readUInt32BE(offset);
      const type = fileBuffer.toString("ascii", offset + 4, offset + 8);
      if (["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) return true;
      const nextOffset = offset + 12 + length;
      if (nextOffset <= offset || nextOffset > fileBuffer.length) break;
      offset = nextOffset;
    }
  }

  if (mimeType === "image/webp") {
    let offset = 12;
    while (offset + 8 <= fileBuffer.length) {
      const type = fileBuffer.toString("ascii", offset, offset + 4);
      const length = fileBuffer.readUInt32LE(offset + 4);
      if (type === "EXIF" || type === "XMP ") return true;
      const nextOffset = offset + 8 + length + (length % 2);
      if (nextOffset <= offset || nextOffset > fileBuffer.length) break;
      offset = nextOffset;
    }
  }

  return false;
}

export function validateImageBytes(fileBuffer: Buffer, declaredMimeType?: string) {
  const detectedMimeType = detectImageMimeType(fileBuffer);
  if (!detectedMimeType) {
    throw new LocalStorageError("지원되지 않는 이미지 형식입니다.", 400);
  }
  if (declaredMimeType && declaredMimeType !== detectedMimeType) {
    throw new LocalStorageError("파일 형식 위변조가 감지되었습니다.", 400);
  }
  if (hasSensitiveMetadata(fileBuffer, detectedMimeType)) {
    throw new LocalStorageError("위치 정보가 포함될 수 있는 이미지 메타데이터는 허용되지 않습니다.", 400);
  }

  const dimensions = readImageDimensions(fileBuffer, detectedMimeType);
  if (
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > MAX_IMAGE_EDGE ||
    dimensions.height > MAX_IMAGE_EDGE ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
  ) {
    throw new LocalStorageError("이미지 해상도가 허용 범위를 벗어났습니다.", 400);
  }

  return { mimeType: detectedMimeType, ...dimensions };
}

function parseMeta(raw: string): LocalStoredFileMeta {
  const parsed = JSON.parse(raw) as Partial<LocalStoredFileMeta>;
  if (
    !parsed ||
    typeof parsed.id !== "string" ||
    typeof parsed.ownerId !== "string" ||
    typeof parsed.originalName !== "string" ||
    typeof parsed.storedName !== "string" ||
    typeof parsed.mimeType !== "string" ||
    typeof parsed.size !== "number" ||
    typeof parsed.createdAt !== "string"
  ) {
    throw new LocalStorageError("손상된 파일 메타데이터입니다.", 500);
  }

  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      parsed.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    ) ||
    !/^[0-9a-f-]+\.(jpg|png|webp)$/i.test(parsed.storedName) ||
    parsed.size < 0 ||
    parsed.size > MAX_UPLOAD_BYTES ||
    (parsed.status !== undefined && parsed.status !== "ready" && parsed.status !== "attached") ||
    (parsed.pointId !== undefined && !UUID_PATTERN.test(parsed.pointId)) ||
    (parsed.status === "attached" && !parsed.pointId)
  ) {
    throw new LocalStorageError("손상된 파일 메타데이터입니다.", 500);
  }

  return parsed as LocalStoredFileMeta;
}

export async function saveLocalUploadedFile(file: File, ownerId: string) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new LocalStorageError("최적화된 파일 크기는 10MB 이하여야 합니다.", 400);
  }

  if (!ownerId || ownerId.trim().length === 0) {
    throw new LocalStorageError("소유자 정보가 필요합니다.", 401);
  }

  await ensureStorageDirectories();

  const fileId = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { mimeType } = validateImageBytes(buffer, file.type || undefined);
  const storedName = toStoredName(fileId, mimeType);
  const safeOriginalName = sanitizeOriginalName(file.name);

  const uploadPath = getFilePath(storedName);
  const metaPath = getMetaPath(fileId);

  await writeFile(uploadPath, buffer, { flag: "wx", mode: 0o600 });

  const meta: LocalStoredFileMeta = {
    id: fileId,
    ownerId: ownerId.trim(),
    originalName: safeOriginalName,
    storedName,
    mimeType,
    size: file.size,
    createdAt: new Date().toISOString(),
    status: "ready",
  };

  try {
    await writeFile(metaPath, JSON.stringify(meta), { flag: "wx", mode: 0o600 });
  } catch (error) {
    await rm(uploadPath, { force: true });
    throw error;
  }

  return meta;
}

export async function attachLocalUploadedFiles(
  fileIds: string[],
  ownerId: string,
  pointId: string,
) {
  if (new Set(fileIds).size !== fileIds.length) {
    throw new LocalStorageError("중복된 이미지가 포함되어 있습니다.", 400);
  }
  if (fileIds.some((fileId) => attachingFileIds.has(fileId))) {
    throw new LocalStorageError("이미 연결 중인 이미지가 포함되어 있습니다.", 409);
  }

  fileIds.forEach((fileId) => attachingFileIds.add(fileId));
  const originals: LocalStoredFileMeta[] = [];
  const changed: LocalStoredFileMeta[] = [];
  try {
    for (const fileId of fileIds) {
      const meta = await getLocalUploadedFileMeta(fileId);
      if (!meta || meta.ownerId !== ownerId || (meta.status && meta.status !== "ready")) {
        throw new LocalStorageError("첨부할 수 없는 이미지가 포함되어 있습니다.", 400);
      }
      originals.push(meta);
    }

    for (const meta of originals) {
      const next: LocalStoredFileMeta = { ...meta, status: "attached", pointId };
      await writeFile(getMetaPath(meta.id), JSON.stringify(next), { mode: 0o600 });
      changed.push(meta);
    }
  } catch (error) {
    await Promise.allSettled(
      changed.map((meta) =>
        writeFile(getMetaPath(meta.id), JSON.stringify(meta), { mode: 0o600 }),
      ),
    );
    throw error;
  } finally {
    fileIds.forEach((fileId) => attachingFileIds.delete(fileId));
  }
}

export async function getLocalUploadedFileMeta(fileId: string) {
  validateFileId(fileId);

  try {
    const raw = await readFile(getMetaPath(fileId), "utf-8");
    return parseMeta(raw);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

export async function readLocalUploadedFile(fileId: string) {
  const meta = await getLocalUploadedFileMeta(fileId);
  if (!meta) {
    return null;
  }

  const data = await readFile(getFilePath(meta.storedName));
  return { meta, data };
}

export function buildContentDisposition(filename: string, kind: "inline" | "attachment") {
  const safe = sanitizeOriginalName(filename);
  return `${kind}; filename="${safe}"`;
}
