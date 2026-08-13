'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { ApiError } from '@/lib/api';
import {
  MEAL_LABEL,
  MEAL_TYPES,
  type MealSettlement,
  type MealType,
  type SettlementSheet,
  UNIT_PRICE,
  fetchSettlements,
  generateSettlements,
  updateSettlement,
} from '@/lib/meals';
import { STATUS_LABEL, formatWon } from '@/lib/payments';
import type { PaymentStatus } from '@/lib/payments';

const STATUS_STYLE: Record<PaymentStatus, string> = {
  PAID: 'bg-accent/10 text-accent border-accent/30',
  PARTIAL: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
  UNPAID: 'bg-danger/10 text-danger border-danger/30',
  EXEMPT: 'bg-surface text-muted border-border',
};

const METHODS = ['카드', '계좌'] as const;

function currentYearMonth(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function MealSettlementsPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [data, setData] = useState<{ key: string; sheet: SettlementSheet } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [year, month] = yearMonth.split('-').map(Number);
  const key = `${yearMonth}:${mealType}`;

  useEffect(() => {
    let cancelled = false;

    fetchSettlements(year, month, mealType)
      .then((sheet) => {
        if (cancelled) return;
        setData({ key: `${yearMonth}:${mealType}`, sheet });
        setError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setData({
          key: `${yearMonth}:${mealType}`,
          sheet: {
            summary: { totalServed: 0, totalAmount: 0, unpaidCount: 0, unpaidAmount: 0 },
            items: [],
          },
        });
        setError(caught instanceof ApiError ? caught.message : '정산 내역을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [yearMonth, mealType, year, month, reloadKey]);

  const loaded = data?.key === key;
  const sheet = loaded ? data.sheet : null;
  const loading = !loaded;

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await generateSettlements(year, month, mealType);
      const parts = [`${result.created}건 생성`];
      if (result.updated > 0) parts.push(`${result.updated}건 갱신`);
      if (result.skippedPaid > 0) parts.push(`결제 완료 ${result.skippedPaid}건은 그대로 둠`);
      setNotice(parts.join(' · '));
      setReloadKey((k) => k + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '정산 생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function patchRow(id: number, updater: (row: MealSettlement) => MealSettlement) {
    setData((current) =>
      current && current.key === key
        ? {
            ...current,
            sheet: {
              ...current.sheet,
              items: current.sheet.items.map((row) => (row.id === id ? updater(row) : row)),
            },
          }
        : current,
    );
  }

  async function handlePay(row: MealSettlement, method: string) {
    const previous = row;
    patchRow(row.id, (r) => ({ ...r, status: 'PAID', method }));
    try {
      const updated = await updateSettlement(row.id, { status: 'PAID', method });
      patchRow(row.id, () => updated);
      setError(null);
    } catch (caught) {
      patchRow(row.id, () => previous);
      setError(
        caught instanceof ApiError ? caught.message : `${row.student.name} 결제 처리에 실패했습니다.`,
      );
    }
  }

  async function handleUnpay(row: MealSettlement) {
    const previous = row;
    patchRow(row.id, (r) => ({ ...r, status: 'UNPAID', method: null }));
    try {
      const updated = await updateSettlement(row.id, { status: 'UNPAID', method: null });
      patchRow(row.id, () => updated);
      setError(null);
    } catch (caught) {
      patchRow(row.id, () => previous);
      setError(caught instanceof ApiError ? caught.message : '되돌리지 못했습니다.');
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">급식비 정산</h1>
          <p className="mt-1 text-sm text-muted">
            실제 수령한 횟수 × {formatWon(UNIT_PRICE)}원 · 후불
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

          <input
            type="month"
            value={yearMonth}
            onChange={(e) => e.target.value && setYearMonth(e.target.value)}
            aria-label="정산할 달"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '집계 중…' : '정산 집계'}
          </button>
        </div>
      </div>

      {sheet && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
            수령{' '}
            <span className="font-mono font-semibold tabular-nums">{sheet.summary.totalServed}</span>
            회
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
            청구{' '}
            <span className="font-mono font-semibold tabular-nums">
              {formatWon(sheet.summary.totalAmount)}
            </span>
            원
          </span>
          <span className="rounded-full border border-danger/30 bg-danger-surface px-3 py-1 text-sm text-danger">
            미납 {sheet.summary.unpaidCount}명{' '}
            <span className="font-mono font-semibold tabular-nums">
              {formatWon(sheet.summary.unpaidAmount)}
            </span>
            원
          </span>
        </div>
      )}

      {notice && (
        <p className="mt-4 rounded-md border border-accent-line bg-accent/5 px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-3xl text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wider text-muted uppercase">
              <th className="px-4 py-3 font-semibold">좌석</th>
              <th className="px-4 py-3 font-semibold">이름</th>
              <th className="px-4 py-3 text-right font-semibold">수령</th>
              <th className="px-4 py-3 text-right font-semibold">청구액</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3 font-semibold">결제</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            )}

            {!loading && !error && sheet?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  아직 정산 내역이 없습니다. 정산 집계를 눌러주세요.
                </td>
              </tr>
            )}

            {!loading &&
              sheet?.items.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.student.seatNo ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{row.student.name}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {row.servedCount}회
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatWon(row.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                    {row.method && <span className="ml-1.5 text-xs text-muted">{row.method}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'PAID' ? (
                      <button
                        onClick={() => handleUnpay(row)}
                        className="text-xs text-muted underline-offset-2 hover:text-danger hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        되돌리기
                      </button>
                    ) : (
                      <span className="flex gap-1">
                        {METHODS.map((method) => (
                          <button
                            key={method}
                            onClick={() => handlePay(row, method)}
                            className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            {method}
                          </button>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        정산 집계는 실제 수령 기록만 셉니다. 신청만 하고 먹지 않은 날은 청구되지 않습니다. 다시
        집계해도 이미 결제 완료된 건은 그대로 둡니다.
      </p>
    </AdminShell>
  );
}
