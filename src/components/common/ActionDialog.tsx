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
      className="fixed inset-0 z-[1250] grid place-items-end bg-[var(--overlay-dialog)] p-3 md:place-items-center"
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
      <div className="elevation-dialog relative w-full max-w-lg rounded-[var(--radius-dialog)] border border-stone-300 bg-[var(--paper-raised)] p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-ledger text-lg font-bold text-[var(--ink)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="border border-stone-300 bg-transparent px-2 py-1 text-xs text-stone-700"
          >
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
