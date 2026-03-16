import {
  buildContentDisposition,
  LocalStorageError,
  readLocalUploadedFile,
} from "@/lib/local-file-storage";
import { resolveRequestUserId } from "@/lib/request-user";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json(
      { message: "로그인이 필요한 기능입니다." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  try {
    const file = await readLocalUploadedFile(id);
    if (!file) {
      return NextResponse.json({ message: "파일을 찾을 수 없습니다." }, { status: 404 });
    }

    if (file.meta.ownerId !== userId) {
      return NextResponse.json(
        { message: "파일 접근 권한이 없습니다." },
        { status: 403 },
      );
    }

    return new NextResponse(file.data, {
      status: 200,
      headers: {
        "Content-Type": file.meta.mimeType,
        "Content-Length": String(file.meta.size),
        "Content-Disposition": buildContentDisposition(file.meta.originalName, "attachment"),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    if (error instanceof LocalStorageError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { message: "파일 다운로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
