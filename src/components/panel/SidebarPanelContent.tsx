"use client";

import AuthStatus from "@/components/common/AuthStatus";
import {
  categoryLabel,
  getCategoryChipStyle,
  getCategoryVisual,
} from "@/lib/point-visuals";
import { CollectionPoint, CATEGORIES, PointCategory } from "@/types/point";
import { ListFilter, LocateFixed, Search } from "lucide-react";

const CATEGORY_ENTRIES = Object.entries(CATEGORIES) as Array<
  [PointCategory, (typeof CATEGORIES)[PointCategory]]
>;

interface SidebarPanelContentProps {
  selectedCategory: PointCategory | "all";
  onSelectCategory: (category: PointCategory | "all") => void;
  query: string;
  onQueryChange: (value: string) => void;
  activeCategoryLabel: string;
  isLoading: boolean;
  totalCount: number;
  onOpenMyReports: () => void;
  onLocate: () => void;
  isLocating: boolean;
  listPoints: CollectionPoint[];
  listTotalCount: number;
  selectedPointId: string | null;
  onPointSelect: (pointId: string) => void;
}

export default function SidebarPanelContent({
  selectedCategory,
  onSelectCategory,
  query,
  onQueryChange,
  activeCategoryLabel,
  isLoading,
  totalCount,
  onOpenMyReports,
  onLocate,
  isLocating,
  listPoints,
  listTotalCount,
  selectedPointId,
  onPointSelect,
}: SidebarPanelContentProps) {
  return (
    <div className="flex h-full flex-col border-b border-emerald-900/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbf9_100%)] md:border-b-0 md:border-r">
      <div className="border-b border-emerald-900/10 px-4 pb-4 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-900 text-lg text-emerald-50">
            ♻
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">RecycleMap</p>
            <h1 className="text-base font-bold tracking-tight text-emerald-900">우리동네 자원순환 알리미</h1>
          </div>
        </div>

        <AuthStatus />

        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            className="w-full rounded-xl border border-emerald-900/15 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 outline-none ring-emerald-700/30 placeholder:text-stone-400 focus:ring"
            placeholder="주소 또는 장소명으로 검색"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              selectedCategory === "all"
                ? "bg-emerald-900 text-emerald-50"
                : "border border-emerald-900/15 bg-white text-stone-600"
            }`}
          >
            전체
          </button>
          {CATEGORY_ENTRIES.map(([key]) => {
            const visual = getCategoryChipStyle(key, selectedCategory === key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
                style={visual}
              >
                {categoryLabel(key)}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
          <p>
            {activeCategoryLabel} · {isLoading ? "불러오는 중" : `${totalCount}개`}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onOpenMyReports}
              className="rounded-lg border border-emerald-900/15 bg-white px-2 py-1 font-semibold text-emerald-900"
            >
              내 제보
            </button>
            <button
              type="button"
              onClick={onLocate}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-900 bg-emerald-900 px-2 py-1 font-semibold text-emerald-50"
            >
              <LocateFixed size={12} /> {isLocating ? "위치 확인 중" : "내 위치"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center px-4 py-3">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700">
          <ListFilter size={13} /> 수거함 목록
        </span>
      </div>

      {listTotalCount > listPoints.length ? (
        <p data-testid="panel-list-summary" className="px-4 pb-1 text-[11px] text-stone-500">
          데이터가 많아 목록은 {listPoints.length}개만 표시합니다. (전체 {listTotalCount}개)
        </p>
      ) : null}

      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {listTotalCount === 0 ? (
          <p className="rounded-xl border border-dashed border-emerald-900/20 bg-emerald-50/50 p-3 text-sm text-stone-600">
            현재 조건에 맞는 수거함이 없습니다.
          </p>
        ) : (
          listPoints.map((point) => {
            const visual = getCategoryVisual(point.category);
            return (
              <button
                key={point.id}
                data-testid="panel-point-item"
                type="button"
                onClick={() => onPointSelect(point.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                  selectedPointId === point.id
                    ? "border-emerald-900 bg-emerald-50"
                    : "border-transparent bg-white hover:border-emerald-900/20"
                }`}
              >
                <p className="text-[11px] font-semibold" style={{ color: visual.textColor }}>
                  {categoryLabel(point.category)}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-stone-900">{point.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{point.address ?? "주소 미입력"}</p>
                <p className="mt-1 text-[11px] text-stone-500">
                  평점 {point.avgRating} · 리뷰 {point.reviewCount}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
