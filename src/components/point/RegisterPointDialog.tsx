"use client";

import PointForm from "@/components/point/PointForm";
import { getClientDevUserId } from "@/lib/client-dev-user";
import { UserRound } from "lucide-react";
import { signIn, useSession } from "next-auth/react";

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
  const { data: session, status } = useSession();
  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  if (!open || !position) {
    return null;
  }

  const isLoggedIn = Boolean(session?.user || getClientDevUserId());
  const isLoading = status === "loading";

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-[var(--overlay-dialog)] px-3"
      role="dialog"
      aria-modal="true"
      aria-label="수거함 등록"
    >
      <div className="elevation-dialog w-full max-w-lg rounded-[var(--radius-dialog)] border border-stone-300 bg-[var(--paper-raised)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-ledger text-xl font-bold text-[var(--ink)]">이 위치에 수거함 등록</h2>
          <button
            type="button"
            onClick={onClose}
            className="border border-stone-300 bg-transparent px-2 py-1 text-xs text-stone-700 transition hover:border-stone-500"
          >
            닫기
          </button>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-stone-500">로그인 상태 확인 중...</p>
        ) : isLoggedIn ? (
          <PointForm
            position={position}
            onSuccess={() => {
              onSuccess();
              onClose();
            }}
          />
        ) : (
          <div className="border-y border-stone-300 px-4 py-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center text-[var(--trust)]">
              <UserRound size={22} />
            </span>
            <p className="mt-3 text-sm font-semibold text-stone-900">로그인이 필요합니다</p>
            <p className="mt-1 text-xs text-stone-500">
              수거함 제보는 로그인한 사용자만 이용할 수 있습니다.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => signIn(undefined, { callbackUrl })}
                className="inline-flex items-center gap-1.5 border border-[var(--trust)] bg-[var(--trust)] px-3 py-2 text-sm font-semibold text-white"
              >
                <UserRound size={14} /> 로그인하기
              </button>
              <button
                type="button"
                onClick={onClose}
                className="border border-stone-300 bg-transparent px-3 py-2 text-sm text-stone-700"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
