"use client";

import { TEST_ACCOUNTS } from "@/constants/test-accounts";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function LoginClient({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const { data } = useSession();

  const [accountId, setAccountId] = useState(TEST_ACCOUNTS[0]?.id ?? "owner");
  const [passcode, setPasscode] = useState("");
  const [nickname, setNickname] = useState("개발테스터");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedAccountName = useMemo(
    () =>
      TEST_ACCOUNTS.find((account) => account.id === accountId)?.name ??
      "테스트 계정",
    [accountId],
  );

  function resolveSafeRedirect(url: string | null | undefined) {
    if (url && url.startsWith("/") && !url.startsWith("//")) {
      return url;
    }

    return callbackUrl;
  }

  async function handleTestAccountLogin(event: { preventDefault: () => void }) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      accountId,
      passcode,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (!result || result.error) {
      setError("로그인 실패: 계정/패스코드를 확인하세요.");
      return;
    }

    router.push(resolveSafeRedirect(result.url));
    router.refresh();
  }

  async function handleDevNicknameLogin() {
    setError(null);
    setIsLoading(true);

    const result = await signIn("credentials", {
      nickname,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (!result || result.error) {
      setError("개발 로그인 실패");
      return;
    }

    router.push(resolveSafeRedirect(result.url));
    router.refresh();
  }

  if (data?.user) {
    return (
      <main className="mx-auto min-h-screen max-w-xl bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.14),transparent_45%),linear-gradient(180deg,#f7fcf6_0%,#eef7f2_100%)] p-6">
        <div className="rounded-3xl border border-emerald-900/15 bg-white/85 p-6 shadow-[0_14px_28px_rgba(8,45,24,0.08)]">
          <h1 className="text-xl font-bold text-stone-900">이미 로그인되어 있습니다.</h1>
          <p className="mt-2 text-sm text-stone-600">{data.user.name ?? "사용자"}</p>
          <button
            type="button"
            onClick={() => router.push(callbackUrl)}
            className="mt-4 rounded-xl bg-emerald-800 px-3 py-2 text-sm font-semibold text-emerald-50"
          >
            서비스로 이동
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-4 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.14),transparent_45%),linear-gradient(180deg,#f7fcf6_0%,#eef7f2_100%)] p-6">
      <section className="rounded-3xl border border-emerald-900/15 bg-white/85 p-6 shadow-[0_14px_28px_rgba(8,45,24,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900/60">RecycleMap Access</p>
        <h1 className="mt-1 text-xl font-bold text-stone-900">테스트 계정 로그인</h1>
        <p className="mt-1 text-sm text-stone-600">
          OAuth 연결 전에도 탐색/제보/리뷰 흐름을 바로 검증할 수 있습니다.
        </p>

        <form className="mt-4 space-y-3" onSubmit={handleTestAccountLogin}>
          <p className="block text-xs font-semibold text-stone-700">계정 선택</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setAccountId(account.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  accountId === account.id
                    ? "border-emerald-800 bg-emerald-800 text-emerald-50"
                    : "border-emerald-900/20 text-stone-700 hover:bg-emerald-50"
                }`}
              >
                {account.name}
              </button>
            ))}
          </div>

          <p className="text-xs text-stone-500">선택됨: {selectedAccountName}</p>

          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="테스트 계정 패스코드"
            className="w-full rounded-xl border border-emerald-900/20 px-3 py-2 text-sm"
            required
          />

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-emerald-800 px-3 py-2 text-sm font-semibold text-emerald-50 disabled:opacity-70"
          >
            {isLoading ? "로그인 중..." : "테스트 계정으로 로그인"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-emerald-900/15 bg-white/85 p-6 shadow-[0_14px_28px_rgba(8,45,24,0.08)]">
        <h2 className="text-base font-semibold text-stone-900">개발 전용 닉네임 로그인</h2>
        <p className="mt-1 text-xs text-stone-500">
          production 환경에서는 비활성화됩니다.
        </p>
        <div className="mt-3 space-y-2">
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className="w-full rounded-xl border border-emerald-900/20 px-3 py-2 text-sm"
            placeholder="닉네임"
          />
          <button
            type="button"
            onClick={handleDevNicknameLogin}
            className="w-full rounded-xl border border-emerald-900/20 px-3 py-2 text-sm text-stone-700 transition hover:bg-emerald-50"
          >
            닉네임으로 로그인
          </button>
        </div>
      </section>
    </main>
  );
}
