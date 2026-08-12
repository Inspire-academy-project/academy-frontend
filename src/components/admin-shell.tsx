'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ROLE_LABEL, logout, useRequireAuth } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: '홈' },
  { href: '/students', label: '원생' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/dashboard" className="font-mono text-xs tracking-widest text-muted uppercase">
            Inspire Academy
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? 'bg-accent/10 font-semibold text-accent' : 'text-muted hover:bg-background'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted">
              {user.name} <span className="text-xs">({ROLE_LABEL[user.role]})</span>
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
