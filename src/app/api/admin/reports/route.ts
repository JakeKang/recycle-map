import { repository } from "@/lib/data-repository";
import { isAdminUserId, resolveRequestUserId } from "@/lib/request-user";
import { AdminReportItem } from "@/types/admin";
import { Report } from "@/types/report";
import { NextRequest, NextResponse } from "next/server";

function parseStatus(value: string | null): Report["status"] | undefined {
  if (value === "pending" || value === "resolved" || value === "dismissed") {
    return value;
  }
  return undefined;
}

function parseType(value: string | null): Report["type"] | undefined {
  if (
    value === "incorrect_location" ||
    value === "no_longer_exists" ||
    value === "wrong_category" ||
    value === "spam" ||
    value === "inappropriate" ||
    value === "other"
  ) {
    return value;
  }
  return undefined;
}

function parseSort(value: string | null): "newest" | "oldest" {
  return value === "oldest" ? "oldest" : "newest";
}

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "로그인이 필요한 기능입니다." }, { status: 401 });
  }
  if (!isAdminUserId(userId)) {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const status = parseStatus(request.nextUrl.searchParams.get("status"));
  const type = parseType(request.nextUrl.searchParams.get("type"));
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = parseSort(request.nextUrl.searchParams.get("sort"));

  const reports = await repository.listReports(status ?? "pending");
  const items: AdminReportItem[] = await Promise.all(
    reports.map(async (report) => {
      const point = await repository.getPoint(report.pointId);
      return {
        report,
        point: point
          ? {
              id: point.id,
              title: point.title,
              category: point.category,
              address: point.address,
              status: point.status,
              verifiedAt: point.verifiedAt,
            }
          : null,
      };
    }),
  );

  const filtered = items
    .filter((item) => (type ? item.report.type === type : true))
    .filter((item) => {
      if (!q) {
        return true;
      }
      const haystack = [
        item.report.reason ?? "",
        item.point?.title ?? "",
        item.point?.address ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      if (sort === "oldest") {
        return a.report.createdAt.localeCompare(b.report.createdAt);
      }
      return b.report.createdAt.localeCompare(a.report.createdAt);
    });

  return NextResponse.json(filtered);
}
