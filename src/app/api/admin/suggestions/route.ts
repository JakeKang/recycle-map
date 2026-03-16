import { repository } from "@/lib/data-repository";
import { isAdminUserId, resolveRequestUserId } from "@/lib/request-user";
import { AdminSuggestionItem } from "@/types/admin";
import { PointCategory } from "@/types/point";
import { PointSuggestion } from "@/types/suggestion";
import { NextRequest, NextResponse } from "next/server";

function parseStatus(value: string | null): PointSuggestion["status"] | undefined {
  if (value === "pending" || value === "applied" || value === "dismissed") {
    return value;
  }
  return undefined;
}

function parseCategory(value: string | null): PointCategory | undefined {
  if (
    value === "battery" ||
    value === "electronics" ||
    value === "medicine" ||
    value === "fluorescent" ||
    value === "toner" ||
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
  const category = parseCategory(request.nextUrl.searchParams.get("category"));
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = parseSort(request.nextUrl.searchParams.get("sort"));

  const suggestions = await repository.listAllSuggestions(status ?? "pending");
  const items: AdminSuggestionItem[] = await Promise.all(
    suggestions.map(async (suggestion) => {
      const point = await repository.getPoint(suggestion.pointId);
      return {
        suggestion,
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
    .filter((item) => (category ? item.suggestion.payload.category === category : true))
    .filter((item) => {
      if (!q) {
        return true;
      }
      const haystack = [
        item.suggestion.payload.description ?? "",
        item.suggestion.payload.address ?? "",
        item.point?.title ?? "",
        item.point?.address ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      if (sort === "oldest") {
        return a.suggestion.createdAt.localeCompare(b.suggestion.createdAt);
      }
      return b.suggestion.createdAt.localeCompare(a.suggestion.createdAt);
    });

  return NextResponse.json(filtered);
}
