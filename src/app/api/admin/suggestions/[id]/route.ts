import { formatValidationIssues } from "@/lib/api-error";
import { readJsonBody } from "@/lib/http-body";
import { repository } from "@/lib/data-repository";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, resolveClientAddress } from "@/lib/request-security";
import { isAdminUserId, resolveRequestUserId } from "@/lib/request-user";
import { adminSuggestionDecisionSchema } from "@/lib/validators";
import { isUuidParam } from "@/lib/route-params";
import { recordSecurityAuditEvent } from "@/lib/security-audit";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
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
  if (!isAdminUserId(userId)) {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const clientAddress = resolveClientAddress(request);
  const rateLimit = await consumeRateLimit({
    key: `admin:suggestions:patch:${userId}:${clientAddress}`,
    windowMs: 60_000,
    max: 60,
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

  const parsed = adminSuggestionDecisionSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  if (!isUuidParam(id)) {
    return NextResponse.json({ message: "잘못된 제안 식별자입니다." }, { status: 400 });
  }
  const allSuggestions = await repository.listAllSuggestions();
  const target = allSuggestions.find((item) => item.id === id);
  if (!target) {
    return NextResponse.json({ message: "수정 제안을 찾을 수 없습니다." }, { status: 404 });
  }

  if (parsed.data.status === "applied") {
    await repository.patchPoint(target.pointId, {
      category: target.payload.category,
      address: target.payload.address ?? null,
      description: target.payload.description ?? null,
    });
  }

  const updated = await repository.updateSuggestionStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ message: "수정 제안을 찾을 수 없습니다." }, { status: 404 });
  }

  await recordSecurityAuditEvent({
    actorId: userId,
    action: "suggestion.moderate",
    targetType: "point_suggestion",
    targetId: id,
    outcome: "success",
    details: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}
