"use client";

import { extractErrorMessage } from "@/lib/api-error";
import { buildClientJsonHeaders } from "@/lib/client-dev-user";
import { categoryLabel } from "@/lib/point-visuals";
import {
  AdminFilterState,
  AdminReportItem,
  AdminReportStatusFilter,
  AdminReportTypeFilter,
  AdminSortFilter,
  AdminSuggestionItem,
  AdminSuggestionStatusFilter,
} from "@/types/admin";
import { CATEGORIES, PointCategory } from "@/types/point";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

async function getJsonOrThrow<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: buildClientJsonHeaders() });
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new Error(extractErrorMessage(payload, "관리자 데이터를 불러오지 못했습니다."));
  }

  return response.json();
}

const PARAM_KEYS = {
  reportStatus: "r_status",
  reportType: "r_type",
  reportSort: "r_sort",
  reportQ: "r_q",
  suggestStatus: "s_status",
  suggestCategory: "s_category",
  suggestSort: "s_sort",
  suggestQ: "s_q",
} as const;

interface AdminDashboardClientProps {
  initialFilters: AdminFilterState;
}

export default function AdminDashboardClient({ initialFilters }: AdminDashboardClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [reportStatus, setReportStatus] = useState<AdminReportStatusFilter>(
    initialFilters.reportStatus,
  );
  const [reportType, setReportType] = useState<AdminReportTypeFilter>(initialFilters.reportType);
  const [reportSort, setReportSort] = useState<AdminSortFilter>(initialFilters.reportSort);
  const [reportQ, setReportQ] = useState(initialFilters.reportQ);

  const [suggestStatus, setSuggestStatus] = useState<AdminSuggestionStatusFilter>(
    initialFilters.suggestStatus,
  );
  const [suggestCategory, setSuggestCategory] = useState<"all" | PointCategory>(
    initialFilters.suggestCategory,
  );
  const [suggestSort, setSuggestSort] = useState<AdminSortFilter>(initialFilters.suggestSort);
  const [suggestQ, setSuggestQ] = useState(initialFilters.suggestQ);

  const syncUrl = useCallback(
    (patch: Partial<AdminFilterState>) => {
      const next: AdminFilterState = {
        reportStatus,
        reportType,
        reportSort,
        reportQ,
        suggestStatus,
        suggestCategory,
        suggestSort,
        suggestQ,
        ...patch,
      };

      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, value: string, defaultValue: string) => {
        if (value === defaultValue) {
          params.delete(key);
          return;
        }
        params.set(key, value);
      };

      setOrDelete(PARAM_KEYS.reportStatus, next.reportStatus, "pending");
      setOrDelete(PARAM_KEYS.reportType, next.reportType, "all");
      setOrDelete(PARAM_KEYS.reportSort, next.reportSort, "newest");
      setOrDelete(PARAM_KEYS.suggestStatus, next.suggestStatus, "pending");
      setOrDelete(PARAM_KEYS.suggestCategory, next.suggestCategory, "all");
      setOrDelete(PARAM_KEYS.suggestSort, next.suggestSort, "newest");

      const normalizedReportQ = next.reportQ.trim();
      if (normalizedReportQ.length === 0) {
        params.delete(PARAM_KEYS.reportQ);
      } else {
        params.set(PARAM_KEYS.reportQ, normalizedReportQ);
      }

      const normalizedSuggestQ = next.suggestQ.trim();
      if (normalizedSuggestQ.length === 0) {
        params.delete(PARAM_KEYS.suggestQ);
      } else {
        params.set(PARAM_KEYS.suggestQ, normalizedSuggestQ);
      }

      const nextQueryString = params.toString();
      const nextUrl = nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [
      pathname,
      reportQ,
      reportSort,
      reportStatus,
      reportType,
      router,
      searchParams,
      suggestCategory,
      suggestQ,
      suggestSort,
      suggestStatus,
    ],
  );

  const reportQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", reportStatus);
    params.set("sort", reportSort);
    if (reportType !== "all") {
      params.set("type", reportType);
    }
    if (reportQ.trim().length > 0) {
      params.set("q", reportQ.trim());
    }
    return params.toString();
  }, [reportQ, reportSort, reportStatus, reportType]);

  const suggestQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", suggestStatus);
    params.set("sort", suggestSort);
    if (suggestCategory !== "all") {
      params.set("category", suggestCategory);
    }
    if (suggestQ.trim().length > 0) {
      params.set("q", suggestQ.trim());
    }
    return params.toString();
  }, [suggestCategory, suggestQ, suggestSort, suggestStatus]);

  const {
    data: reports = [],
    error: reportsError,
    isLoading: reportsLoading,
  } = useQuery<AdminReportItem[]>({
    queryKey: ["admin", "reports", reportStatus, reportType, reportSort, reportQ],
    queryFn: () => getJsonOrThrow<AdminReportItem[]>(`/api/admin/reports?${reportQuery}`),
  });

  const {
    data: suggestions = [],
    error: suggestionsError,
    isLoading: suggestionsLoading,
  } = useQuery<AdminSuggestionItem[]>({
    queryKey: ["admin", "suggestions", suggestStatus, suggestCategory, suggestSort, suggestQ],
    queryFn: () => getJsonOrThrow<AdminSuggestionItem[]>(`/api/admin/suggestions?${suggestQuery}`),
  });

  const reportDecisionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "신고 처리에 실패했습니다."));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  const suggestionDecisionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "applied" | "dismissed" }) => {
      const response = await fetch(`/api/admin/suggestions/${id}`, {
        method: "PATCH",
        headers: buildClientJsonHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(extractErrorMessage(payload, "수정 제안 처리에 실패했습니다."));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "suggestions"] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#f5faf7_0%,#edf6f0_100%)] px-4 py-5">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl border border-emerald-900/15 bg-white/90 px-4 py-3 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">관리자 검토 대시보드</h1>
          <p className="text-sm text-stone-600">
            신고와 수정 제안을 확인하고 승인/반려할 수 있습니다.
          </p>
        </header>

        <section className="rounded-2xl border border-rose-900/10 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-stone-900">신고 목록</h2>
            <span className="text-xs text-stone-500">{reports.length}건</span>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <select
              value={reportStatus}
              onChange={(event) => {
                const next = event.target.value as AdminReportStatusFilter;
                setReportStatus(next);
                syncUrl({ reportStatus: next });
              }}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            >
              <option value="pending">상태: 대기</option>
              <option value="resolved">상태: 승인</option>
              <option value="dismissed">상태: 반려</option>
            </select>
            <select
              value={reportType}
              onChange={(event) => {
                const next = event.target.value as AdminReportTypeFilter;
                setReportType(next);
                syncUrl({ reportType: next });
              }}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            >
              <option value="all">유형: 전체</option>
              <option value="incorrect_location">위치 오류</option>
              <option value="no_longer_exists">존재하지 않음</option>
              <option value="wrong_category">분류 오류</option>
              <option value="spam">스팸</option>
              <option value="inappropriate">부적절</option>
              <option value="other">기타</option>
            </select>
            <select
              value={reportSort}
              onChange={(event) => {
                const next = event.target.value as AdminSortFilter;
                setReportSort(next);
                syncUrl({ reportSort: next });
              }}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            >
              <option value="newest">정렬: 최신순</option>
              <option value="oldest">정렬: 오래된순</option>
            </select>
            <input
              value={reportQ}
              onChange={(event) => {
                const next = event.target.value;
                setReportQ(next);
                syncUrl({ reportQ: next });
              }}
              placeholder="사유/포인트 검색"
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            />
          </div>
          {reportsLoading ? <p className="mt-2 text-sm text-stone-600">불러오는 중...</p> : null}
          {reportsError ? (
            <p className="mt-2 text-sm text-rose-700">
              {reportsError instanceof Error ? reportsError.message : "신고 목록 조회 실패"}
            </p>
          ) : null}
          {!reportsLoading && !reportsError && reports.length === 0 ? (
            <p className="mt-2 text-sm text-stone-600">조건에 맞는 신고가 없습니다.</p>
          ) : null}
          <div className="mt-3 space-y-2">
            {reports.map((item) => (
              <article
                key={item.report.id}
                className="rounded-xl border border-rose-900/10 bg-rose-50/40 p-3"
              >
                <p className="text-sm font-semibold text-stone-900">유형: {item.report.type}</p>
                <p className="text-xs text-stone-600">사유: {item.report.reason ?? "(없음)"}</p>
                {item.point ? (
                  <p className="text-xs text-stone-600">
                    대상: {item.point.title} ({item.point.address ?? "주소 없음"})
                  </p>
                ) : (
                  <p className="text-xs text-stone-600">대상 포인트를 찾을 수 없습니다.</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-900 bg-emerald-900 px-2.5 py-1 text-xs font-semibold text-emerald-50"
                    onClick={() =>
                      reportDecisionMutation.mutate({ id: item.report.id, status: "resolved" })
                    }
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700"
                    onClick={() =>
                      reportDecisionMutation.mutate({ id: item.report.id, status: "dismissed" })
                    }
                  >
                    반려
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-900/10 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-stone-900">수정 제안 목록</h2>
            <span className="text-xs text-stone-500">{suggestions.length}건</span>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            <select
              value={suggestStatus}
              onChange={(event) => {
                const next = event.target.value as AdminSuggestionStatusFilter;
                setSuggestStatus(next);
                syncUrl({ suggestStatus: next });
              }}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            >
              <option value="pending">상태: 대기</option>
              <option value="applied">상태: 적용</option>
              <option value="dismissed">상태: 반려</option>
            </select>
            <select
              value={suggestCategory}
              onChange={(event) => {
                const next = event.target.value as "all" | PointCategory;
                setSuggestCategory(next);
                syncUrl({ suggestCategory: next });
              }}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            >
              <option value="all">카테고리: 전체</option>
              {(Object.keys(CATEGORIES) as PointCategory[]).map((key) => (
                <option key={key} value={key}>
                  카테고리: {CATEGORIES[key].label}
                </option>
              ))}
            </select>
            <select
              value={suggestSort}
              onChange={(event) => {
                const next = event.target.value as AdminSortFilter;
                setSuggestSort(next);
                syncUrl({ suggestSort: next });
              }}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            >
              <option value="newest">정렬: 최신순</option>
              <option value="oldest">정렬: 오래된순</option>
            </select>
            <input
              value={suggestQ}
              onChange={(event) => {
                const next = event.target.value;
                setSuggestQ(next);
                syncUrl({ suggestQ: next });
              }}
              placeholder="설명/포인트 검색"
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-700"
            />
          </div>
          {suggestionsLoading ? <p className="mt-2 text-sm text-stone-600">불러오는 중...</p> : null}
          {suggestionsError ? (
            <p className="mt-2 text-sm text-rose-700">
              {suggestionsError instanceof Error ? suggestionsError.message : "수정 제안 목록 조회 실패"}
            </p>
          ) : null}
          {!suggestionsLoading && !suggestionsError && suggestions.length === 0 ? (
            <p className="mt-2 text-sm text-stone-600">조건에 맞는 수정 제안이 없습니다.</p>
          ) : null}
          <div className="mt-3 space-y-2">
            {suggestions.map((item) => (
              <article
                key={item.suggestion.id}
                className="rounded-xl border border-blue-900/10 bg-blue-50/40 p-3"
              >
                <p className="text-sm font-semibold text-stone-900">
                  제안 카테고리: {categoryLabel(item.suggestion.payload.category)}
                </p>
                {item.point ? (
                  <p className="text-xs text-stone-600">
                    현재 카테고리: {categoryLabel(item.point.category)}
                  </p>
                ) : null}
                <p className="text-xs text-stone-600">
                  주소: {item.suggestion.payload.address ?? "(없음)"}
                </p>
                <p className="text-xs text-stone-600">
                  설명: {item.suggestion.payload.description ?? "(없음)"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-900 bg-emerald-900 px-2.5 py-1 text-xs font-semibold text-emerald-50"
                    onClick={() =>
                      suggestionDecisionMutation.mutate({
                        id: item.suggestion.id,
                        status: "applied",
                      })
                    }
                  >
                    적용
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700"
                    onClick={() =>
                      suggestionDecisionMutation.mutate({
                        id: item.suggestion.id,
                        status: "dismissed",
                      })
                    }
                  >
                    반려
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
