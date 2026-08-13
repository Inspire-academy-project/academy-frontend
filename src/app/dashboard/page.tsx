'use client';

import Link from 'next/link';
import { AdminShell } from '@/components/admin-shell';

export default function DashboardPage() {
  return (
    <AdminShell>
      <h1 className="text-xl font-bold tracking-tight">홈</h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/attendance"
          className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <h2 className="font-semibold">출결</h2>
          <p className="mt-1 text-sm text-muted">오늘 등원 체크, 지난 날짜 수정</p>
        </Link>
        <Link
          href="/students"
          className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <h2 className="font-semibold">원생</h2>
          <p className="mt-1 text-sm text-muted">명단 조회, 원생 등록</p>
        </Link>
        <Link
          href="/payments"
          className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <h2 className="font-semibold">학원비</h2>
          <p className="mt-1 text-sm text-muted">청구서 생성, 입금 기록, 미납 현황</p>
        </Link>
        <Link
          href="/meals"
          className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <h2 className="font-semibold">급식</h2>
          <p className="mt-1 text-sm text-muted">오늘 수령 체크, 월별 정산</p>
        </Link>
      </div>

    </AdminShell>
  );
}
