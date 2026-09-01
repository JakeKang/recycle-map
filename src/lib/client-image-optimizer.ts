import {
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
  MAX_SOURCE_IMAGE_BYTES,
  MAX_STORED_IMAGE_BYTES,
} from "@/lib/image-upload-policy";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 최적화에 실패했습니다."))),
      "image/webp",
      quality,
    );
  });
}

export async function optimizeImageForUpload(source: File) {
  if (!ALLOWED_TYPES.has(source.type)) {
    throw new Error("JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.");
  }
  if (source.size < 1 || source.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("원본 이미지는 파일당 50MB 이하여야 합니다.");
  }

  const bitmap = await createImageBitmap(source);
  try {
    if (
      bitmap.width < 1 ||
      bitmap.height < 1 ||
      bitmap.width * bitmap.height > MAX_IMAGE_PIXELS
    ) {
      throw new Error("이미지 해상도가 허용 범위를 벗어났습니다.");
    }

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("이 브라우저에서는 이미지를 최적화할 수 없습니다.");
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let optimized: Blob | null = null;
    for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56]) {
      optimized = await canvasToBlob(canvas, quality);
      if (optimized.size <= MAX_STORED_IMAGE_BYTES) {
        break;
      }
    }

    if (!optimized || optimized.size > MAX_STORED_IMAGE_BYTES) {
      throw new Error("이미지를 10MB 이하로 최적화하지 못했습니다.");
    }

    const baseName = source.name.replace(/\.[^.]+$/, "").slice(0, 100) || "image";
    return new File([optimized], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
