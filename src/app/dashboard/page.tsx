'use client';

import { useRouter } from 'next/navigation';
import { ROLE_LABEL, logout, useRequireAuth } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth(['ADMIN', 'TEACHER']);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">불러오는 중…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Inspire Academy</p>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{user.name}님</h1>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          로그아웃
        </button>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">이어서 만들 화면</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
          <li>원생 목록·등록</li>
          <li>출결 체크판</li>
          <li>학원비 청구·미납 현황</li>
          <li>급식 신청·수령·정산</li>
        </ul>
      </section>
    </main>
  );
}
