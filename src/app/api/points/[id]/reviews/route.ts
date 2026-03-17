import { formatValidationIssues } from "@/lib/api-error";
import { readJsonBody } from "@/lib/http-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { toPublicReviews } from "@/lib/public-mappers";
import { resolveClientAddress, isSameOriginRequest } from "@/lib/request-security";
import { repository } from "@/lib/data-repository";
import { resolveRequestUserId } from "@/lib/request-user";
import { reviewSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const rawPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;
  const all = await repository.listReviews(id);
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit);

  return NextResponse.json({ data: toPublicReviews(data), total: all.length });
}

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
    key: `reviews:create:${userId}:${clientAddress}`,
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
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const created = await repository.createReview({
    pointId: id,
    userId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  });

  if (!created) {
    return NextResponse.json(
      { message: "포인트당 리뷰는 1회만 작성 가능합니다." },
      { status: 409 },
    );
  }

  return NextResponse.json(created, { status: 201 });
}
