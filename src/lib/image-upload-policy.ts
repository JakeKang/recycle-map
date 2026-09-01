export const MAX_SOURCE_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BATCH_BYTES = 150 * 1024 * 1024;
export const MAX_IMAGES_PER_POINT = 5;
export const MAX_IMAGE_PIXELS = 60_000_000;
export const MAX_IMAGE_EDGE = 3_840;

interface ImageUploadSize {
  sourceBytes: number;
  storedBytes: number;
}

export function validateImageUploadBatch(
  files: ImageUploadSize[],
): { ok: true } | { ok: false; message: string } {
  if (files.length > MAX_IMAGES_PER_POINT) {
    return { ok: false, message: "이미지는 최대 5장까지 첨부할 수 있습니다." };
  }

  if (files.some((file) => file.sourceBytes < 1 || file.sourceBytes > MAX_SOURCE_IMAGE_BYTES)) {
    return { ok: false, message: "원본 이미지는 파일당 50MB 이하여야 합니다." };
  }

  if (files.some((file) => file.storedBytes < 1 || file.storedBytes > MAX_STORED_IMAGE_BYTES)) {
    return { ok: false, message: "최적화된 이미지는 파일당 10MB 이하여야 합니다." };
  }

  const totalSourceBytes = files.reduce((sum, file) => sum + file.sourceBytes, 0);
  if (totalSourceBytes > MAX_UPLOAD_BATCH_BYTES) {
    return { ok: false, message: "한 번에 선택한 원본 이미지 합계는 150MB 이하여야 합니다." };
  }

  return { ok: true };
}
