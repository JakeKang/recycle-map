"use client";

import { LogOut, Map as MapIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AccountActions() {
  const router = useRouter();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="inline-flex items-center gap-1 border border-stone-300 bg-transparent px-3 py-2 text-sm font-semibold text-[var(--trust)]"
      >
        <MapIcon size={14} /> 지도 홈으로
      </button>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex items-center gap-1 border border-stone-300 bg-transparent px-3 py-2 text-sm font-semibold text-stone-700"
      >
        <LogOut size={14} /> 로그아웃
      </button>
    </div>
  );
}
