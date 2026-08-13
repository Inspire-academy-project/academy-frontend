'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { ApiError } from '@/lib/api';
import { formatDateLabel, shiftDate, todayInKst } from '@/lib/attendance';
import {
  MEAL_LABEL,
  MEAL_TYPES,
  type MealRecordSheet,
  type MealType,
  fetchMealRecords,
  markMealReceived,
} from '@/lib/meals';

export default function MealsPage() {
  const [date, setDate] = useState(todayInKst);
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  // 불러온 날짜·끼니를 함께 담아 두면 로딩 여부를 따로 저장하지 않아도 된다.
  const [data, setData] = useState<{ key: string; sheet: MealRecordSheet } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<number[]>([]);

  const key = `${date}:${mealType}`;

  useEffect(() => {
    let cancelled = false;

    fetchMealRecords(date, mealType)
      .then((sheet) => {
        if (cancelled) return;
        setData({ key: `${date}:${mealType}`, sheet });
        setError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setData({ key: `${date}:${mealType}`, sheet: { operating: true, items: [] } });
        setError(caught instanceof ApiError ? caught.message : '수령표를 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [date, mealType]);

  const loaded = data?.key === key;
  const sheet = loaded ? data.sheet : null;
  const loading = !loaded;

  const received = useMemo(
    () => (sheet ? sheet.items.filter((row) => row.received).length : 0),
    [sheet],
  );

  async function handleToggle(studentId: number, next: boolean) {
    if (!sheet) return;

    setPending((p) => [...p, studentId]);
    // 먼저 화면을 바꾸고, 실패하면 되돌린다.
    setData((current) =>
      current && current.key === key
        ? {
            ...current,
            sheet: {
              ...current.sheet,
              items: current.sheet.items.map((row) =>
                row.studentId === studentId ? { ...row, received: next } : row,
              ),
            },
          }
        : current,
    );

    try {
      await markMealReceived(studentId, date, mealType, next);
      setError(null);
    } catch (caught) {
      setData((current) =>
        current && current.key === key
          ? {
              ...current,
              sheet: {
                ...current.sheet,
                items: current.sheet.items.map((row) =>
                  row.studentId === studentId ? { ...row, received: !next } : row,
                ),
              },
            }
          : current,
      );
      setError(caught instanceof ApiError ? caught.message : '수령 기록에 실패했습니다.');
    } finally {
      setPending((p) => p.filter((id) => id !== studentId));
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">급식 수령표</h1>
          <p className="mt-1 text-sm text-muted">
            {formatDateLabel(date)} · {MEAL_LABEL[mealType]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border" role="group" aria-label="끼니">
            {MEAL_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                aria-pressed={mealType === type}
                className={`px-3 py-2 text-sm transition-colors first:rounded-l-md last:rounded-r-md ${
                  mealType === type
                    ? 'bg-accent font-semibold text-white'
                    : 'text-muted hover:bg-surface'
                }`}
              >
                {MEAL_LABEL[type]}
              </button>
            ))}
          </div>

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

      {sheet && sheet.operating && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent-line bg-accent/5 px-3 py-1 text-sm text-accent">
            준비 수량{' '}
            <span className="font-mono font-semibold tabular-nums">{sheet.items.length}</span>인분
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
            수령 <span className="font-mono font-semibold tabular-nums">{received}</span>
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
            미수령{' '}
            <span className="font-mono font-semibold tabular-nums">
              {sheet.items.length - received}
            </span>
          </span>
        </div>
      )}

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

        {!loading && sheet && !sheet.operating && (
          <p className="px-4 py-10 text-center text-sm text-muted">
            급식을 운영하지 않는 날입니다.
            {sheet.note ? ` (${sheet.note})` : ''}
          </p>
        )}

        {!loading && sheet && sheet.operating && sheet.items.length === 0 && !error && (
          <p className="px-4 py-10 text-center text-sm text-muted">
            이 날 {MEAL_LABEL[mealType]}을 신청한 원생이 없습니다.
          </p>
        )}

        {!loading &&
          sheet?.operating &&
          sheet.items.map((row) => (
            <label
              key={row.studentId}
              className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-background"
            >
              <input
                type="checkbox"
                checked={row.received}
                disabled={pending.includes(row.studentId)}
                onChange={(e) => handleToggle(row.studentId, e.target.checked)}
                className="size-5 accent-[var(--accent)]"
              />
              <span className="w-12 font-mono text-xs text-muted">{row.seatNo ?? '—'}</span>
              <span className={row.received ? 'font-medium' : 'font-medium text-muted'}>
                {row.name}
              </span>
              {row.received && <span className="ml-auto text-xs text-accent">수령</span>}
            </label>
          ))}
      </div>

      <p className="mt-3 text-xs text-muted">
        신청한 원생만 표시됩니다. 체크하면 바로 저장되며, 월말 정산은 실제 수령한 횟수로만
        계산됩니다.
      </p>
    </AdminShell>
  );
}
