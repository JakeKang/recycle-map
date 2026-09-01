import { consumeRateLimit } from "@/lib/rate-limit";
import { resolveClientAddress, isSameOriginRequest } from "@/lib/request-security";
import {
  LocalStorageError,
  saveLocalUploadedFile,
} from "@/lib/local-file-storage";
import { resolveRequestUserId } from "@/lib/request-user";
import { MAX_STORED_IMAGE_BYTES } from "@/lib/image-upload-policy";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 origin입니다." }, { status: 403 });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "운영 환경에서는 직접 저장소 업로드를 사용해야 합니다." },
      { status: 410 },
    );
  }

  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json(
      { message: "로그인이 필요한 기능입니다." },
      { status: 401 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_STORED_IMAGE_BYTES + 512 * 1024
  ) {
    return NextResponse.json(
      { message: "업로드 요청 본문이 너무 큽니다." },
      { status: 413 },
    );
  }

  const clientAddress = resolveClientAddress(request);
  const rateLimit = await consumeRateLimit({
    key: `upload:create:${userId}:${clientAddress}`,
    windowMs: 60_000,
    max: 30,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      },
    );
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "유효한 multipart/form-data 요청이 필요합니다." },
      { status: 400 },
    );
  }
  const file = data.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "file 필드가 필요합니다." }, { status: 400 });
  }

  try {
    const saved = await saveLocalUploadedFile(file, userId);

    return NextResponse.json(
      {
        id: saved.id,
        url: `/api/upload/${saved.id}`,
        readUrl: `/api/upload/${saved.id}`,
        downloadUrl: `/api/upload/${saved.id}/download`,
        name: saved.originalName,
        mimeType: saved.mimeType,
        size: saved.size,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof LocalStorageError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: "파일 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
