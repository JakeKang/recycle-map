import AccountActions from "@/components/account/AccountActions";
import { authOptions } from "@/lib/auth-options";
import { isAdminUserId } from "@/lib/request-user";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Faccount");
  }

  const name = session.user.name?.trim() || "사용자";
  const email = session.user.email?.trim() || "이메일 정보 없음";
  const userId = session.user.id;
  const isAdmin = isAdminUserId(userId);

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[var(--paper)] px-5 py-10 md:py-16">
      <section className="border-y border-stone-300 py-7">
        <h1 className="font-ledger text-3xl font-bold tracking-[-0.03em] text-[var(--ink)]">회원정보</h1>
        <p className="mt-1 text-sm text-stone-600">로그인된 계정 정보와 바로가기 메뉴를 확인할 수 있습니다.</p>

        <div className="mt-6 grid border-t border-stone-300 sm:grid-cols-2">
          <article className="border-b border-stone-300 py-4 sm:border-r sm:pr-4">
            <p className="text-xs font-semibold text-stone-500">닉네임</p>
            <p className="mt-1 text-base font-semibold text-stone-900">{name}</p>
          </article>
          <article className="border-b border-stone-300 py-4 sm:pl-4">
            <p className="text-xs font-semibold text-stone-500">로그인 식별자</p>
            <p className="mt-1 truncate text-sm font-semibold text-stone-900">{userId}</p>
          </article>
          <article className="border-b border-stone-300 py-4 sm:col-span-2">
            <p className="text-xs font-semibold text-stone-500">이메일</p>
            <p className="mt-1 truncate text-sm font-medium text-stone-700">{email}</p>
          </article>
        </div>

        <div className="mt-6 border-t border-stone-300 pt-5">
          <p className="text-sm font-semibold text-[var(--trust)]">빠른 이동</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="border border-stone-300 bg-transparent px-3 py-1.5 font-semibold text-[var(--trust)]"
            >
              지도 홈
            </Link>
            <Link
              href="/?reports=1"
              className="border border-stone-300 bg-transparent px-3 py-1.5 font-semibold text-[var(--trust)]"
            >
              내 제보 바로가기
            </Link>
            <Link
              href="/login?callbackUrl=%2F"
              className="border border-stone-300 bg-transparent px-3 py-1.5 font-semibold text-[var(--trust)]"
            >
              계정 전환
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="border border-stone-300 bg-transparent px-3 py-1.5 font-semibold text-[var(--trust)]"
              >
                관리자 화면
              </Link>
            ) : null}
          </div>
        </div>

        <AccountActions />
      </section>
    </main>
  );
}
