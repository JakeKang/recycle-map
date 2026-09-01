import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, resolveClientAddress } from "@/lib/request-security";
import { resolveRequestUserId } from "@/lib/request-user";
import { LocalStorageError } from "@/lib/local-file-storage";
import { completeSupabaseUpload } from "@/lib/supabase-upload";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 origin입니다." }, { status: 403 });
  }
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "로그인이 필요한 기능입니다." }, { status: 401 });
  }
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ message: "잘못된 파일 식별자입니다." }, { status: 400 });
  }

  const rateLimit = await consumeRateLimit({
    key: `upload:complete:${userId}:${resolveClientAddress(request)}`,
    windowMs: 60_000,
    max: 20,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  try {
    const saved = await completeSupabaseUpload(userId, id);
    return NextResponse.json({
      ...saved,
      readUrl: `/api/upload/${saved.id}`,
      downloadUrl: `/api/upload/${saved.id}/download`,
    });
  } catch (error) {
    if (error instanceof LocalStorageError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "업로드 검증 중 오류가 발생했습니다." }, { status: 500 });
  }
}
