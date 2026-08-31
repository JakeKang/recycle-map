import { formatValidationIssues } from "@/lib/api-error";
import { repository } from "@/lib/data-repository";
import { readJsonBody } from "@/lib/http-body";
import { toPublicPoint } from "@/lib/public-mappers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { resolveRequestUserId } from "@/lib/request-user";
import { resolveClientAddress, isSameOriginRequest } from "@/lib/request-security";
import { verificationVoteSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ vote: null });
  }

  const { id } = await context.params;
  const vote = await repository.getVerificationVote(id, userId);
  return NextResponse.json({ vote: vote?.value ?? null });
}

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
  const point = await repository.getPoint(id);
  if (!point) {
    return NextResponse.json({ message: "포인트를 찾을 수 없습니다." }, { status: 404 });
  }
  if (point.userId === userId) {
    return NextResponse.json(
      { message: "자신이 등록한 위치에는 투표할 수 없습니다." },
      { status: 403 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `points:verification-vote:${userId}:${resolveClientAddress(request)}`,
    windowMs: 60_000,
    max: 30,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ message: bodyResult.message }, { status: 400 });
  }
  const parsed = verificationVoteSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const result = await repository.castVerificationVote(id, userId, parsed.data.value);
  if (!result) {
    return NextResponse.json({ message: "포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    point: toPublicPoint(result.point),
    vote: result.vote.value,
  });
}
