"use client";

import { useMyPoints, useUpdatePoint } from "@/hooks/usePoints";
import { PublicPoint as CollectionPoint } from "@/lib/public-mappers";
import { CATEGORIES, PointCategory } from "@/types/point";
import { Edit3 } from "lucide-react";
import { useMemo, useState } from "react";

interface MyReportsSheetProps {
  open: boolean;
  onClose: () => void;
  onFocusPoint: (point: CollectionPoint) => void;
}

export default function MyReportsSheet({ open, onClose, onFocusPoint }: MyReportsSheetProps) {
  const { data: points = [], isLoading, error } = useMyPoints(open);
  const updateMutation = useUpdatePoint();
  const [editingPoint, setEditingPoint] = useState<CollectionPoint | null>(null);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PointCategory>("other");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openEditor = (point: CollectionPoint) => {
    setSuccessMessage(null);
    setEditingPoint(point);
    setTitle(point.title);
    setAddress(point.address ?? "");
    setDescription(point.description ?? "");
    setCategory(point.category);
  };

  const hasPoints = useMemo(() => points.length > 0, [points]);

  if (!open) {
    return null;
  }

  return (
    <>
      <aside className="fixed bottom-0 left-0 z-[1150] h-[72vh] w-full overflow-y-auto rounded-t-3xl border border-emerald-900/15 bg-[linear-gradient(180deg,#f9fcf8_0%,#eef7f2_100%)] p-4 shadow-[0_-14px_30px_rgba(15,23,42,0.2)] md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-screen md:max-w-[380px] md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900">내 제보 관리</h2>
            <p className="text-[11px] text-stone-500">내가 등록한 수거함 정보를 정정할 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
          >
            닫기
          </button>
        </div>

        {isLoading ? <p className="text-sm text-stone-600">내 제보 목록을 불러오는 중...</p> : null}

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error instanceof Error ? error.message : "내 제보 목록을 불러오지 못했습니다."}
          </p>
        ) : null}

        {!isLoading && !error && !hasPoints ? (
          <p className="rounded-xl border border-dashed border-emerald-900/20 bg-white/80 p-3 text-sm text-stone-600">
            아직 등록한 제보가 없습니다.
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
            {successMessage}
          </p>
        ) : null}

        <div className="space-y-2">
          {points.map((point) => (
            <div key={point.id} className="rounded-2xl border border-emerald-900/10 bg-white/90 p-3">
              <p className="text-sm font-semibold text-stone-900">{point.title}</p>
              <p className="text-xs text-stone-500">{point.address ?? "주소 미입력"}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-full border border-emerald-900/20 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-900">
                  {CATEGORIES[point.category].label}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onFocusPoint(point)}
                    className="rounded-md border border-emerald-900/15 bg-white px-2 py-1 text-xs text-stone-700"
                  >
                    지도 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditor(point)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-900/20 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900"
                  >
                    <Edit3 size={12} /> 편집
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {editingPoint ? (
        <div className="fixed inset-0 z-[1200] grid place-items-center bg-[rgba(15,23,42,0.45)] px-3" role="dialog" aria-modal="true" aria-label="내 제보 편집">
          <form
            className="w-full max-w-lg space-y-2 rounded-3xl border border-emerald-900/15 bg-[linear-gradient(160deg,#f8fcf6_0%,#eef8f3_100%)] p-4 shadow-[0_24px_50px_rgba(15,23,42,0.28)]"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await updateMutation.mutateAsync({
                  id: editingPoint.id,
                  payload: {
                    title,
                    category,
                    address: address || undefined,
                    description: description || undefined,
                  },
                });
                setEditingPoint(null);
                setSuccessMessage("제보 정보가 저장되었습니다.");
              } catch {
              }
            }}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-900">제보 정보 편집</h3>
              <button
                type="button"
                onClick={() => setEditingPoint(null)}
                disabled={updateMutation.isPending}
                className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
              >
                취소
              </button>
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={updateMutation.isPending}
              className="w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
              placeholder="제목"
              required
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as PointCategory)}
              disabled={updateMutation.isPending}
              className="w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
            >
              {(Object.keys(CATEGORIES) as PointCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORIES[key].label}
                </option>
              ))}
            </select>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              disabled={updateMutation.isPending}
              className="w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
              placeholder="주소"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={updateMutation.isPending}
              className="h-24 w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
              placeholder="설명"
            />

            {updateMutation.error ? (
              <p className="text-xs text-rose-700">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : "수정에 실패했습니다."}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full rounded-xl border border-emerald-900 bg-emerald-900 px-3 py-2 text-sm font-semibold text-emerald-50 disabled:opacity-70"
            >
              {updateMutation.isPending ? "저장 중..." : "저장하기"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
