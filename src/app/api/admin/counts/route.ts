import { repository } from "@/lib/data-repository";
import { isSameOriginRequest } from "@/lib/request-security";
import { isAdminUserId, resolveRequestUserId } from "@/lib/request-user";
import { NextRequest, NextResponse } from "next/server";

export interface AdminCounts {
  pendingReports: number;
  pendingSuggestions: number;
}

export async function GET(request: NextRequest) {
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

  const [reports, suggestions] = await Promise.all([
    repository.listReports("pending"),
    repository.listAllSuggestions("pending"),
  ]);

  const counts: AdminCounts = {
    pendingReports: reports.length,
    pendingSuggestions: suggestions.length,
  };

  return NextResponse.json(counts);
}
