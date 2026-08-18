'use client';

import { useEffect, useMemo, useState } from 'react';
import { StudentShell } from '@/components/student-shell';
import { ApiError } from '@/lib/api';
import {
  type AttendanceStatus,
  STATUS_LABEL as ATTENDANCE_LABEL,
  STATUS_ORDER,
  formatTime,
} from '@/lib/attendance';
import {
  type MyAttendance,
  type MyPayment,
  currentMonth,
  dayLabel,
  fetchMyAttendance,
  fetchMyPayments,
  monthLabel,
  monthRange,
  shiftMonth,
} from '@/lib/me';
import { STATUS_LABEL as PAYMENT_LABEL, type PaymentStatus, formatWon } from '@/lib/payments';

const ATTENDANCE_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-accent/10 text-accent',
  LATE: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  ABSENT: 'bg-danger/10 text-danger',
  EXCUSED: 'bg-muted/15 text-muted',
};

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  PAID: 'bg-accent/10 text-accent',
  PARTIAL: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  UNPAID: 'bg-danger/10 text-danger',
  EXEMPT: 'bg-muted/15 text-muted',
};

export default function MyPage() {
  return (
    <StudentShell>
      <MyAttendanceSection />
      <MyPaymentSection />
    </StudentShell>
  );
}

/* ---------- 내 출결 ---------- */

function MyAttendanceSection() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<{ month: string; rows: MyAttendance[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 불러온 달을 함께 담아 두면 로딩 여부를 따로 저장하지 않아도 된다.
  const loaded = data?.month === month;
  const rows = useMemo(() => (loaded ? data.rows : []), [loaded, data]);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = monthRange(month);

    fetchMyAttendance(from, to)
      .then((fetched) => {
        if (cancelled) return;
        setData({ month, rows: fetched });
        setError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setData({ month, rows: [] });
        setError(caught instanceof ApiError ? caught.message : '출결을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [month]);

  const counts = useMemo(() => {
    const result = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    for (const row of rows) result[row.status] += 1;
    return result;
  }, [rows]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">내 출결</h1>
          <p className="mt-1 text-sm text-muted">{monthLabel(month)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="지난달"
            className="rounded-md border border-border px-2.5 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ←
          </button>
          <button
            onClick={() => setMonth(currentMonth())}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            이번 달
          </button>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="다음달"
            className="rounded-md border border-border px-2.5 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_ORDER.map((status) => (
          <span
            key={status}
            className="rounded-full border border-border bg-surface px-3 py-1 text-sm"
          >
            {ATTENDANCE_LABEL[status]}{' '}
            <span className="font-mono font-semibold">{counts[status]}</span>
          </span>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        {!loaded && <p className="px-4 py-10 text-center text-sm text-muted">불러오는 중…</p>}

        {loaded && !error && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted">
            이 달에는 출결 기록이 없습니다.
          </p>
        )}

        {loaded &&
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="w-28 text-sm">{dayLabel(row.date)}</span>

              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${ATTENDANCE_STYLE[row.status]}`}
              >
                {ATTENDANCE_LABEL[row.status]}
              </span>

              <span className="ml-auto flex items-center gap-3 font-mono text-xs tabular-nums text-muted">
                <Punch label="등원" at={formatTime(row.checkInAt)} />
                <Punch label="하원" at={formatTime(row.checkOutAt)} />
              </span>
            </div>
          ))}
      </div>

      <p className="mt-2 text-xs text-muted">
        등원·하원 시각은 패드에 번호를 찍은 시각입니다.
      </p>
    </section>
  );
}

/** 안 찍은 날은 자리만 비운다. 줄마다 폭이 달라지면 훑어보기 어렵다. */
function Punch({ label, at }: { label: string; at: string | null }) {
  if (!at) return <span className="w-[4.5rem]" aria-hidden />;

  return (
    <span className="w-[4.5rem]">
      {label} <span className="font-semibold text-foreground">{at}</span>
    </span>
  );
}

/* ---------- 내 납부 ---------- */

function MyPaymentSection() {
  const [rows, setRows] = useState<MyPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchMyPayments()
      .then((fetched) => {
        if (!cancelled) setRows(fetched);
      })
      .catch((caught) => {
        if (cancelled) return;
        setRows([]);
        setError(caught instanceof ApiError ? caught.message : '납부 내역을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unpaid = rows?.filter((r) => r.status === 'UNPAID' || r.status === 'PARTIAL') ?? [];
  const unpaidTotal = unpaid.reduce((sum, r) => sum + (r.amount - r.paidAmount), 0);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">내 납부</h2>

      {unpaidTotal > 0 && (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger">
          아직 내지 않은 금액이 <strong>{formatWon(unpaidTotal)}원</strong> 있습니다.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        {!rows && <p className="px-4 py-10 text-center text-sm text-muted">불러오는 중…</p>}

        {rows && !error && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted">아직 청구된 내역이 없습니다.</p>
        )}

        {rows?.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="text-sm font-medium">{row.period.label}</span>

            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${PAYMENT_STYLE[row.status]}`}
            >
              {PAYMENT_LABEL[row.status]}
            </span>

            <span className="ml-auto font-mono text-sm tabular-nums">
              {formatWon(row.paidAmount)}
              <span className="text-muted"> / {formatWon(row.amount)}원</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
