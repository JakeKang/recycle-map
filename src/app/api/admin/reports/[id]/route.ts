import { formatValidationIssues } from "@/lib/api-error";
import { readJsonBody } from "@/lib/http-body";
import { repository } from "@/lib/data-repository";
import { isAdminUserId, resolveRequestUserId } from "@/lib/request-user";
import { adminReportDecisionSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "로그인이 필요한 기능입니다." }, { status: 401 });
  }
  if (!isAdminUserId(userId)) {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ message: bodyResult.message }, { status: 400 });
  }

  const parsed = adminReportDecisionSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json(
      { message: formatValidationIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const updated = await repository.updateReportStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ message: "신고를 찾을 수 없습니다." }, { status: 404 });
  }

  if (parsed.data.status === "resolved" && updated.type === "no_longer_exists") {
    await repository.patchPoint(updated.pointId, { status: "inactive" });
  }

  return NextResponse.json(updated);
}
