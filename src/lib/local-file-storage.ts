import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIME_EXTENSION_MAP: Record<(typeof ALLOWED_IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

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
    parsed.size > MAX_UPLOAD_BYTES
  ) {
    throw new LocalStorageError("손상된 파일 메타데이터입니다.", 500);
  }

  return parsed as LocalStoredFileMeta;
}

export async function saveLocalUploadedFile(file: File, ownerId: string) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new LocalStorageError("파일 크기는 5MB 이하여야 합니다.", 400);
  }

  if (!ownerId || ownerId.trim().length === 0) {
    throw new LocalStorageError("소유자 정보가 필요합니다.", 401);
  }

  await ensureStorageDirectories();

  const fileId = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());

  const detectedMimeType = detectImageMimeType(buffer);
  if (!detectedMimeType) {
    throw new LocalStorageError("지원되지 않는 이미지 형식입니다.", 400);
  }

  if (file.type && file.type !== detectedMimeType) {
    throw new LocalStorageError("파일 형식 위변조가 감지되었습니다.", 400);
  }

  const mimeType = detectedMimeType;
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
  };

  try {
    await writeFile(metaPath, JSON.stringify(meta), { flag: "wx", mode: 0o600 });
  } catch (error) {
    await rm(uploadPath, { force: true });
    throw error;
  }

  return meta;
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
