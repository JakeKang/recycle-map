"use client";

import AuthStatus from "@/components/common/AuthStatus";
import {
  categoryLabel,
  getCategoryChipStyle,
} from "@/lib/point-visuals";
import { verificationStatusLabel } from "@/lib/point-verification";
import { PublicPoint as CollectionPoint } from "@/lib/public-mappers";
import { CATEGORIES, PointCategory } from "@/types/point";
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
    <div className="flex h-full flex-col border-b border-stone-300 bg-[var(--paper-raised)] md:border-b-0 md:border-r">
      <div className="border-b border-stone-300 px-4 pb-4 pt-5">
        <div className="mb-4">
          <h1 className="font-ledger text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">RecycleMap</h1>
          <p className="mt-0.5 text-xs font-medium text-stone-600">우리동네 자원순환 알리미</p>
        </div>

        <AuthStatus />

        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            className="w-full border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-800 outline-none placeholder:text-stone-400"
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
                ? "bg-[var(--trust)] text-white"
                : "border border-stone-300 bg-transparent text-stone-600"
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
              className="border border-stone-300 bg-transparent px-2 py-1.5 font-semibold text-[var(--trust)]"
            >
              내 제보
            </button>
            <button
              type="button"
              onClick={onLocate}
              className="inline-flex items-center gap-1 border border-[var(--trust)] bg-[var(--trust)] px-2 py-1.5 font-semibold text-white"
            >
              <LocateFixed size={12} /> {isLocating ? "위치 확인 중" : "내 위치"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-stone-300 px-4 py-3">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700">
          <ListFilter size={13} /> 수거함 목록
        </span>
        <span className="text-[11px] tabular-nums text-stone-500">{listTotalCount}곳</span>
      </div>

      {listTotalCount > listPoints.length ? (
        <p data-testid="panel-list-summary" className="px-4 pb-1 text-[11px] text-stone-500">
          데이터가 많아 목록은 {listPoints.length}개만 표시합니다. (전체 {listTotalCount}개)
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {listTotalCount === 0 ? (
          <p className="m-4 border border-dashed border-stone-400 p-4 text-sm leading-6 text-stone-600">
            현재 조건에 맞는 수거함이 없습니다. 검색어를 줄이거나 다른 카테고리를 선택해 주세요.
          </p>
        ) : (
          listPoints.map((point) => {
            return (
              <button
                key={point.id}
                data-testid="panel-point-item"
                type="button"
                onClick={() => onPointSelect(point.id)}
                className={`w-full border-b border-stone-300 px-4 py-3 text-left transition ${
                  selectedPointId === point.id
                    ? "bg-[var(--trust-soft)]"
                    : "bg-transparent hover:bg-[var(--paper-hover)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-stone-600">
                    {categoryLabel(point.category)}
                  </p>
                  <span
                    className={`verification-state verification-state--${point.verificationStatus} !px-1.5 !py-0.5 !text-[10px]`}
                  >
                    {verificationStatusLabel(point.verificationStatus)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-stone-900">{point.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{point.address ?? "주소 미입력"}</p>
                <p className="mt-1 text-[11px] tabular-nums text-stone-500">
                  정확 {point.accurateVoteCount} · 잘못 {point.inaccurateVoteCount} · 리뷰 {point.reviewCount}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
