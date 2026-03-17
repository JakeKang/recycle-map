import { consumeRateLimit } from "@/lib/rate-limit";
import { resolveClientAddress, isSameOriginRequest } from "@/lib/request-security";
import { repository } from "@/lib/data-repository";
import { isAdminUserId, resolveRequestUserId } from "@/lib/request-user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

  if (point.userId !== userId && !isAdminUserId(userId)) {
    return NextResponse.json({ message: "본인이 등록한 수거함만 확인 처리할 수 있습니다." }, { status: 403 });
  }

  const clientAddress = resolveClientAddress(request);
  const rateLimit = consumeRateLimit({
    key: `points:confirm:${userId}:${clientAddress}`,
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

  const updated = await repository.patchPoint(id, { verifiedAt: new Date().toISOString() });
  if (!updated) {
    return NextResponse.json({ message: "포인트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(updated, { status: 200 });
}
