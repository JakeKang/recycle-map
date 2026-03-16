"use client";

import { CATEGORIES, CollectionPoint } from "@/types/point";
import Link from "next/link";

interface PointListProps {
  points: CollectionPoint[];
  emptyMessage?: string;
  maxHeightClass?: string;
}

export default function PointList({
  points,
  emptyMessage = "현재 지도 범위에 등록된 수거함이 없습니다.",
  maxHeightClass = "max-h-[45vh]",
}: PointListProps) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-900/20 bg-white/80 p-4 text-sm text-stone-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className={`${maxHeightClass} space-y-2 overflow-auto pr-1`}>
      {points.map((point) => (
        <li key={point.id}>
          <Link
            href={`/point/${point.id}`}
            className="block rounded-2xl border border-emerald-900/15 bg-white/90 p-3 transition hover:border-emerald-900/40 hover:shadow-[0_8px_18px_rgba(20,80,40,0.12)]"
          >
            <p className="text-sm font-semibold text-stone-900">{point.title}</p>
            <p className="text-xs text-stone-500">{point.address ?? "주소 미입력"}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-600">
              <span className="rounded-full border border-emerald-900/20 bg-emerald-50 px-2 py-0.5 text-emerald-900/85">
                {CATEGORIES[point.category].label}
              </span>
              <span className="font-medium">
                평점 {point.avgRating} ({point.reviewCount})
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
