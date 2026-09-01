"use client";

import { TEST_ACCOUNTS } from "@/constants/test-accounts";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const SOCIAL_PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  kakao: "Kakao",
  naver: "Naver",
};

export default function LoginClient({
  callbackUrl,
  showDevelopmentLogin,
  socialProviders,
}: {
  callbackUrl: string;
  showDevelopmentLogin: boolean;
  socialProviders: string[];
}) {
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
      <main className="mx-auto min-h-screen max-w-2xl bg-[var(--paper)] px-5 py-12 md:py-20">
        <div className="border-y border-stone-300 py-8">
          <h1 className="font-ledger text-2xl font-bold text-[var(--ink)]">이미 로그인되어 있습니다.</h1>
          <p className="mt-2 text-sm text-stone-600">{data.user.name ?? "사용자"}</p>
          <button
            type="button"
            onClick={() => router.push(callbackUrl)}
            className="mt-4 border border-[var(--trust)] bg-[var(--trust)] px-3 py-2 text-sm font-semibold text-white"
          >
            서비스로 이동
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-[var(--paper)] px-5 py-10 md:py-16">
      <header className="mb-8">
        <h1 className="font-ledger text-3xl font-bold tracking-[-0.03em] text-[var(--ink)]">RecycleMap 로그인</h1>
        <p className="mt-1 text-sm text-stone-600">
          위치를 제보하고 검증에 참여하려면 계정이 필요합니다.
        </p>
      </header>

      {socialProviders.length > 0 ? (
        <section className="border-y border-stone-300 py-6">
          <h2 className="font-ledger text-xl font-bold text-[var(--ink)]">소셜 로그인</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {socialProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => signIn(provider, { callbackUrl })}
                className="border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700"
              >
                {SOCIAL_PROVIDER_LABELS[provider] ?? provider}로 로그인
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showDevelopmentLogin ? <section className="border-y border-stone-300 py-6">
        <h2 className="font-ledger text-xl font-bold text-[var(--ink)]">테스트 계정</h2>
        <p className="mt-1 text-sm text-stone-600">역할별 제보·검증·신고 흐름을 확인합니다.</p>

        <form className="mt-4 space-y-3" onSubmit={handleTestAccountLogin}>
          <p className="block text-xs font-semibold text-stone-700">계정 선택</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setAccountId(account.id)}
                className={`border px-3 py-2 text-xs font-medium transition ${
                  accountId === account.id
                    ? "border-[var(--trust)] bg-[var(--trust)] text-white"
                    : "border-stone-300 text-stone-700 hover:border-stone-500"
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
            className="w-full border border-stone-300 bg-[var(--paper-raised)] px-3 py-2 text-sm"
            required
          />

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full border border-[var(--trust)] bg-[var(--trust)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isLoading ? "로그인 중..." : "테스트 계정으로 로그인"}
          </button>
        </form>
      </section> : null}

      {showDevelopmentLogin ? <section className="border-b border-stone-300 py-6">
        <h2 className="font-ledger text-lg font-bold text-[var(--ink)]">개발 전용 닉네임 로그인</h2>
        <p className="mt-1 text-xs text-stone-500">
          production 환경에서는 비활성화됩니다.
        </p>
        <div className="mt-3 space-y-2">
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            className="w-full border border-stone-300 bg-[var(--paper-raised)] px-3 py-2 text-sm"
            placeholder="닉네임"
          />
          <button
            type="button"
            onClick={handleDevNicknameLogin}
            className="w-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500"
          >
            닉네임으로 로그인
          </button>
        </div>
      </section> : null}
    </main>
  );
}
