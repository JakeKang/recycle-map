"use client";

import PointForm from "@/components/point/PointForm";

interface RegisterPointDialogProps {
  open: boolean;
  position: { lat: number; lng: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegisterPointDialog({
  open,
  position,
  onClose,
  onSuccess,
}: RegisterPointDialogProps) {
  if (!open || !position) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-[rgba(15,23,42,0.45)] px-3" role="dialog" aria-modal="true" aria-label="수거함 등록">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-900/15 bg-[linear-gradient(160deg,#f8fcf6_0%,#eef8f3_100%)] p-4 shadow-[0_24px_50px_rgba(15,23,42,0.28)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900/60">
              New Point
            </p>
            <h2 className="text-base font-semibold text-stone-900">이 위치에 수거함 등록</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 transition hover:bg-stone-100"
          >
            닫기
          </button>
        </div>

        <PointForm
          position={position}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
