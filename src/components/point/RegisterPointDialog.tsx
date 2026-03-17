"use client";

import PointForm from "@/components/point/PointForm";
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

  const isLoggedIn = Boolean(session?.user);
  const isLoading = status === "loading";

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-[rgba(15,23,42,0.45)] px-3"
      role="dialog"
      aria-modal="true"
      aria-label="수거함 등록"
    >
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
          <div className="rounded-2xl border border-emerald-900/10 bg-white px-4 py-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-900/8 text-emerald-800">
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900 bg-emerald-900 px-3 py-2 text-sm font-semibold text-emerald-50"
              >
                <UserRound size={14} /> 로그인하기
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
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
