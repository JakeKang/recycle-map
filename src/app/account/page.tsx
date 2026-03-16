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
    <main className="mx-auto min-h-screen max-w-3xl bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.16),transparent_44%),linear-gradient(180deg,#f7fcf6_0%,#eef7f2_100%)] p-6">
      <section className="rounded-3xl border border-emerald-900/15 bg-white/90 p-6 shadow-[0_14px_28px_rgba(8,45,24,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900/60">Account</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">회원정보</h1>
        <p className="mt-1 text-sm text-stone-600">로그인된 계정 정보와 바로가기 메뉴를 확인할 수 있습니다.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-emerald-900/10 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">닉네임</p>
            <p className="mt-1 text-base font-semibold text-stone-900">{name}</p>
          </article>
          <article className="rounded-2xl border border-emerald-900/10 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">로그인 식별자</p>
            <p className="mt-1 truncate text-sm font-semibold text-stone-900">{userId}</p>
          </article>
          <article className="rounded-2xl border border-emerald-900/10 bg-white p-4 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">이메일</p>
            <p className="mt-1 truncate text-sm font-medium text-stone-700">{email}</p>
          </article>
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-900/12 bg-emerald-50/60 p-4">
          <p className="text-sm font-semibold text-emerald-900">빠른 이동</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-lg border border-emerald-900/15 bg-white px-3 py-1.5 font-semibold text-emerald-900"
            >
              지도 홈
            </Link>
            <Link
              href="/?reports=1"
              className="rounded-lg border border-emerald-900/15 bg-white px-3 py-1.5 font-semibold text-emerald-900"
            >
              내 제보 바로가기
            </Link>
            <Link
              href="/login?callbackUrl=%2F"
              className="rounded-lg border border-emerald-900/15 bg-white px-3 py-1.5 font-semibold text-emerald-900"
            >
              계정 전환
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-lg border border-emerald-900/15 bg-white px-3 py-1.5 font-semibold text-emerald-900"
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
