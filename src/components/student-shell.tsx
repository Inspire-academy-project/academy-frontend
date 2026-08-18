'use client';

import { useRouter } from 'next/navigation';
import { logout, useRequireAuth } from '@/lib/auth';

/**
 * 학생이 보는 화면의 껍데기.
 *
 * AdminShell은 원장·강사 전용이라 그대로 쓸 수 없다. 학생은 볼 화면이
 * 하나뿐이라 메뉴도 두지 않는다.
 */
export function StudentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useRequireAuth(['STUDENT']);

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
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <span className="font-mono text-xs tracking-widest text-muted uppercase">
            Inspire Academy
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted">
              {user.name}
              {user.student?.seatNo && (
                <span className="ml-1.5 font-mono text-xs">{user.student.seatNo}</span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
