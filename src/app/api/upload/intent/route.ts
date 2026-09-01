import { formatValidationIssues } from "@/lib/api-error";
import { readJsonBody } from "@/lib/http-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, resolveClientAddress } from "@/lib/request-security";
import { resolveRequestUserId } from "@/lib/request-user";
import { LocalStorageError } from "@/lib/local-file-storage";
import { createSupabaseUploadIntent } from "@/lib/supabase-upload";
import { uploadIntentSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 origin입니다." }, { status: 403 });
  }
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "로그인이 필요한 기능입니다." }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    key: `upload:intent:${userId}:${resolveClientAddress(request)}`,
    windowMs: 60_000,
    max: 20,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({ message: body.message }, { status: 400 });
  }
  const parsed = uploadIntentSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await createSupabaseUploadIntent(userId, parsed.data), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof LocalStorageError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "업로드 준비 중 오류가 발생했습니다." }, { status: 500 });
  }
}
