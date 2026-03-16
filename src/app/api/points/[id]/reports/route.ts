import { formatValidationIssues } from "@/lib/api-error";
import { readJsonBody } from "@/lib/http-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { resolveClientAddress, isSameOriginRequest } from "@/lib/request-security";
import { repository } from "@/lib/data-repository";
import { resolveRequestUserId } from "@/lib/request-user";
import { reportSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 origin입니다." }, { status: 403 });
  }

  const { id } = await context.params;
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json(
      { message: "로그인이 필요한 기능입니다." },
      { status: 401 },
    );
  }

  const point = await repository.getPoint(id);
  if (!point) {
    return NextResponse.json({ message: "포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  const clientAddress = resolveClientAddress(request);
  const rateLimit = consumeRateLimit({
    key: `reports:create:${userId}:${clientAddress}`,
    windowMs: 60_000,
    max: 20,
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

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ message: bodyResult.message }, { status: 400 });
  }

  const payload = bodyResult.data;
  const parsed = reportSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const created = await repository.createReport({
    pointId: id,
    userId,
    type: parsed.data.type,
    reason: parsed.data.reason ?? null,
  });

  return NextResponse.json(created, { status: 201 });
}
