'use client';

import Link from 'next/link';
import { AdminShell } from '@/components/admin-shell';

const NEXT_SCREENS = [
  { label: '학원비 청구·미납 현황', note: '16일~15일 주기 청구, 일할계산' },
  { label: '급식 신청·수령·정산', note: '수령표와 월별 후불 정산' },
];

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
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">이어서 만들 화면</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {NEXT_SCREENS.map((item) => (
            <li key={item.label} className="text-sm">
              <span className="text-foreground">{item.label}</span>
              <span className="text-muted"> — {item.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
