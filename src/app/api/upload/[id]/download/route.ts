import {
  buildContentDisposition,
  LocalStorageError,
  readLocalUploadedFile,
} from "@/lib/local-file-storage";
import { resolveRequestUserId } from "@/lib/request-user";
import { createSupabasePhotoReadUrl } from "@/lib/supabase-upload";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveRequestUserId(request);
  const { id } = await context.params;

  try {
    if (process.env.UPLOAD_STORAGE_MODE === "supabase") {
      const signedUrl = await createSupabasePhotoReadUrl(id, userId, true);
      if (!signedUrl) {
        return NextResponse.json({ message: "파일을 찾을 수 없습니다." }, { status: 404 });
      }
      const response = NextResponse.redirect(signedUrl, 307);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const file = await readLocalUploadedFile(id);
    if (!file) {
      return NextResponse.json({ message: "파일을 찾을 수 없습니다." }, { status: 404 });
    }

    if (file.meta.ownerId !== userId && file.meta.status !== "attached") {
      return NextResponse.json(
        { message: userId ? "파일 접근 권한이 없습니다." : "로그인이 필요한 기능입니다." },
        { status: userId ? 403 : 401 },
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
