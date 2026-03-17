"use client";

import type React from "react";

interface ActionDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ActionDialog({ title, open, onClose, children }: ActionDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1250] grid place-items-end bg-[rgba(15,23,42,0.45)] p-3 md:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="다이얼로그 닫기"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-emerald-900/15 bg-[linear-gradient(160deg,#f8fcf6_0%,#eef8f3_100%)] p-4 shadow-[0_24px_50px_rgba(15,23,42,0.28)]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
          >
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
