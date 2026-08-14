'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { ApiError } from '@/lib/api';
import {
  type AttendanceRow,
  type AttendanceStatus,
  STATUS_LABEL,
  STATUS_ORDER,
  fetchAttendance,
  formatDateLabel,
  formatTime,
  markAttendance,
  markAttendanceBulk,
  shiftDate,
  todayInKst,
} from '@/lib/attendance';
import { GENDER_LABEL } from '@/lib/students';

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-accent text-white border-accent',
  LATE: 'bg-amber-500 text-white border-amber-500',
  ABSENT: 'bg-danger text-white border-danger',
  EXCUSED: 'bg-muted text-white border-muted',
};

/** 아직 찍지 않았으면 자리만 비워 둔다. 줄이 흔들리지 않게 폭은 고정한다. */
function Punch({ label, at }: { label: string; at: string | null }) {
  if (!at) return <span className="w-[4.5rem]" aria-hidden />;

  return (
    <span className="w-[4.5rem]">
      {label} <span className="font-semibold text-foreground">{at}</span>
    </span>
  );
}

export default function AttendancePage() {
  const [date, setDate] = useState(todayInKst);
  // 불러온 날짜를 함께 담아 두면 로딩 여부를 따로 저장하지 않아도 된다.
  const [data, setData] = useState<{ date: string; rows: AttendanceRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState<number[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  const loaded = data?.date === date;
  const rows = useMemo(() => (loaded ? data.rows : []), [loaded, data]);
  const loading = !loaded;

  useEffect(() => {
    let cancelled = false;

    fetchAttendance(date)
      .then((fetched) => {
        if (cancelled) return;
        setData({ date, rows: fetched });
        setError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setData({ date, rows: [] });
        setError(caught instanceof ApiError ? caught.message : '출결을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [date, reloadKey]);

  const setRows = useCallback(
    (updater: (current: AttendanceRow[]) => AttendanceRow[]) => {
      setData((current) =>
        current && current.date === date ? { ...current, rows: updater(current.rows) } : current,
      );
    },
    [date],
  );

  const summary = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, NONE: 0 };
    for (const row of rows) {
      if (row.attendance) counts[row.attendance.status] += 1;
      else counts.NONE += 1;
    }
    return counts;
  }, [rows]);

  async function handleMark(row: AttendanceRow, status: AttendanceStatus) {
    if (row.attendance?.status === status) return;

    const previous = row.attendance;
    setPending((p) => [...p, row.studentId]);
    // 먼저 화면을 바꾸고, 실패하면 되돌린다.
    // 시각은 서버도 건드리지 않으므로 그대로 둔다.
    setRows((current) =>
      current.map((r) =>
        r.studentId === row.studentId
          ? {
              ...r,
              attendance: {
                id: previous?.id ?? 0,
                status,
                checkInAt: previous?.checkInAt ?? null,
                checkOutAt: previous?.checkOutAt ?? null,
                note: previous?.note ?? null,
              },
            }
          : r,
      ),
    );

    try {
      await markAttendance(row.studentId, date, status);
      setError(null);
    } catch (caught) {
      setRows((current) =>
        current.map((r) => (r.studentId === row.studentId ? { ...r, attendance: previous } : r)),
      );
      setError(
        caught instanceof ApiError
          ? caught.message
          : `${row.name} 학생의 출결을 저장하지 못했습니다.`,
      );
    } finally {
      setPending((p) => p.filter((id) => id !== row.studentId));
    }
  }

  async function handleFillPresent() {
    const targets = rows.filter((r) => !r.attendance);
    if (targets.length === 0) return;

    setBulkRunning(true);
    setError(null);
    try {
      await markAttendanceBulk(
        date,
        targets.map((r) => ({ studentId: r.studentId, status: 'PRESENT' as const })),
      );
      setReloadKey((k) => k + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '일괄 처리에 실패했습니다.');
    } finally {
      setBulkRunning(false);
    }
  }

  const notEntered = summary.NONE;

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">출결</h1>
          <p className="mt-1 text-sm text-muted">{formatDateLabel(date)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate((d) => shiftDate(d, -1))}
            aria-label="하루 전"
            className="rounded-md border border-border px-2.5 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ←
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="날짜 선택"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />
          <button
            onClick={() => setDate((d) => shiftDate(d, 1))}
            aria-label="하루 후"
            className="rounded-md border border-border px-2.5 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            →
          </button>
          <button
            onClick={() => setDate(todayInKst())}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            오늘
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {STATUS_ORDER.map((status) => (
          <span
            key={status}
            className="rounded-full border border-border bg-surface px-3 py-1 text-sm"
          >
            {STATUS_LABEL[status]} <span className="font-mono font-semibold">{summary[status]}</span>
          </span>
        ))}
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
          미입력 <span className="font-mono font-semibold">{notEntered}</span>
        </span>

        <button
          onClick={handleFillPresent}
          disabled={bulkRunning || notEntered === 0 || loading}
          className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkRunning ? '처리 중…' : `미입력 ${notEntered}명 출석 처리`}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-surface">
        {loading && <p className="px-4 py-10 text-center text-sm text-muted">불러오는 중…</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted">재원 중인 원생이 없습니다.</p>
        )}

        {!loading &&
          rows.map((row) => (
            <div
              key={row.studentId}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <span className="w-12 font-mono text-xs text-muted">{row.seatNo ?? '—'}</span>
              <span className="font-medium">{row.name}</span>
              <span className="text-xs text-muted">
                {row.gender ? GENDER_LABEL[row.gender] : ''}
              </span>

              {/* 학생이 패드에 찍은 시각. 지각 여부는 이 시각을 보고 판단한다. */}
              <div className="ml-auto flex items-center gap-3 font-mono text-xs tabular-nums text-muted">
                <Punch label="등원" at={formatTime(row.attendance?.checkInAt ?? null)} />
                <Punch label="하원" at={formatTime(row.attendance?.checkOutAt ?? null)} />
              </div>

              <div className="flex gap-1" role="group" aria-label={`${row.name} 출결`}>
                {STATUS_ORDER.map((status) => {
                  const active = row.attendance?.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleMark(row, status)}
                      disabled={pending.includes(row.studentId)}
                      aria-pressed={active}
                      className={`min-w-14 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        active
                          ? STATUS_STYLE[status]
                          : 'border-border text-muted hover:bg-background'
                      }`}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </AdminShell>
  );
}
