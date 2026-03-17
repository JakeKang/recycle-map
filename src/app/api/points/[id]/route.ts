import { formatValidationIssues } from "@/lib/api-error";
import { readJsonBody } from "@/lib/http-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { toPublicPoint, toPublicReviews } from "@/lib/public-mappers";
import { resolveClientAddress, isSameOriginRequest } from "@/lib/request-security";
import { repository } from "@/lib/data-repository";
import { resolveRequestUserId } from "@/lib/request-user";
import { pointPatchSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const point = await repository.getPoint(id);
  if (!point) {
    return NextResponse.json({ message: "포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  const reviews = await repository.listReviews(id);
  return NextResponse.json({ ...toPublicPoint(point), reviews: toPublicReviews(reviews) });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청 origin입니다." }, { status: 403 });
  }

  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json(
      { message: "로그인이 필요한 기능입니다." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const point = await repository.getPoint(id);
  if (!point) {
    return NextResponse.json({ message: "포인트를 찾을 수 없습니다." }, { status: 404 });
  }
  if (point.userId !== userId) {
    return NextResponse.json(
      { message: "수정 권한이 없습니다." },
      { status: 403 },
    );
  }

  const clientAddress = resolveClientAddress(request);
  const rateLimit = consumeRateLimit({
    key: `points:patch:${userId}:${clientAddress}`,
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

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ message: bodyResult.message }, { status: 400 });
  }

  const payload = bodyResult.data;
  const parsed = pointPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const updated = await repository.patchPoint(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ message: "포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
