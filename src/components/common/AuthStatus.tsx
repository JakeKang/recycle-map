'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogOut, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthStatus() {
  const { data, status } = useSession();
  const router = useRouter();
  const callbackUrl =
    typeof window === 'undefined'
      ? '/'
      : `${window.location.pathname}${window.location.search}`;

  if (status === 'loading') {
    return (
      <div className='my-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2.5'>
        <p className='text-xs text-stone-500'>로그인 상태 확인 중...</p>
      </div>
    );
  }

  if (data?.user) {
    const userName = data.user.name?.trim() || '사용자';
    const profileLabel = data.user.email?.trim() || '회원정보';

    return (
      <div className='my-3 rounded-xl border border-emerald-900/12 bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.06)]'>
        <div className='flex items-center gap-2'>
          <div className='flex min-w-0 items-center gap-2'>
            <span className='grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-900/10 text-emerald-800'>
              <UserRound size={13} />
            </span>
            <div className='min-w-0'>
              <p className='truncate text-xs font-semibold text-stone-800'>
                {userName}님
              </p>
              <p className='text-[11px] text-stone-500'>
                회원정보 · {profileLabel}
              </p>
            </div>
          </div>
        </div>
        <div className='mt-2 flex items-center justify-end gap-1.5'>
          <button
            type='button'
            onClick={() => router.push('/account')}
            className='inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-900/20 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-900'>
            <UserRound size={12} /> 회원정보
          </button>
          <button
            type='button'
            onClick={() => signOut()}
            className='inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-900/20 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900'>
            <LogOut size={12} /> 로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='my-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]'>
      <div className='flex items-center justify-between gap-2'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold text-stone-800'>
            로그인 후 제보를 관리하세요
          </p>
          <p className='text-[11px] text-stone-500'>
            내 제보 목록과 수정 내역을 바로 확인할 수 있습니다
          </p>
        </div>
        <button
          type='button'
          onClick={() => signIn(undefined, { callbackUrl })}
          className='inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-900 bg-emerald-900 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-50'>
          <UserRound size={12} /> 로그인
        </button>
      </div>
    </div>
  );
}
