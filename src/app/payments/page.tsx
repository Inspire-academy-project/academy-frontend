'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { ApiError } from '@/lib/api';
import {
  type BillingPeriod,
  type Payment,
  type PaymentStatus,
  type RefundStatus,
  STATUS_LABEL,
  createPeriod,
  deriveTuitionPeriod,
  fetchPayments,
  fetchPeriods,
  fetchRefundStatus,
  formatWon,
  generatePayments,
  nextYearMonth,
  recordPayment,
  shortDate,
} from '@/lib/payments';
import { GENDER_LABEL } from '@/lib/students';

const STATUS_STYLE: Record<PaymentStatus, string> = {
  PAID: 'bg-accent/10 text-accent border-accent/30',
  PARTIAL: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
  UNPAID: 'bg-danger/10 text-danger border-danger/30',
  EXEMPT: 'bg-surface text-muted border-border',
};

const inputClass =
  'rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30';

export default function PaymentsPage() {
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [periodId, setPeriodId] = useState<number | null>(null);
  // 불러온 주기를 함께 담아 두면 로딩 여부를 따로 저장하지 않아도 된다.
  const [data, setData] = useState<{ periodId: number; rows: Payment[] } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refund, setRefund] = useState<RefundStatus | null>(null);
  const [creating, setCreating] = useState(false);
  const [newMonth, setNewMonth] = useState(nextYearMonth);

  useEffect(() => {
    let cancelled = false;
    fetchPeriods()
      .then((list) => {
        if (cancelled) return;
        setPeriods(list);
        setPeriodId((current) => current ?? list[0]?.id ?? null);
        setLoadingPeriods(false);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(caught instanceof ApiError ? caught.message : '청구 주기를 불러오지 못했습니다.');
        setLoadingPeriods(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (periodId === null) return;
    let cancelled = false;

    fetchPayments(periodId)
      .then((rows) => {
        if (cancelled) return;
        setData({ periodId, rows });
        setError(null);
      })
      .catch((caught) => {
        if (cancelled) return;
        setData({ periodId, rows: [] });
        setError(caught instanceof ApiError ? caught.message : '납부 현황을 불러오지 못했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [periodId, reloadKey]);

  const loaded = data?.periodId === periodId;
  const payments = useMemo(() => (loaded ? data.rows : []), [loaded, data]);
  const loadingPayments = periodId !== null && !loaded;

  const setPayments = useCallback(
    (updater: (current: Payment[]) => Payment[]) => {
      setData((current) =>
        current && current.periodId === periodId
          ? { ...current, rows: updater(current.rows) }
          : current,
      );
    },
    [periodId],
  );

  const period = periods.find((p) => p.id === periodId) ?? null;

  const summary = useMemo(() => {
    return payments.reduce(
      (acc, row) => {
        acc.total += row.amount;
        acc.collected += row.paidAmount;
        if (row.status === 'UNPAID' || row.status === 'PARTIAL') {
          acc.unpaidCount += 1;
          acc.unpaidAmount += row.amount - row.paidAmount;
        }
        return acc;
      },
      { total: 0, collected: 0, unpaidCount: 0, unpaidAmount: 0 },
    );
  }, [payments]);

  const visible = onlyUnpaid
    ? payments.filter((p) => p.status === 'UNPAID' || p.status === 'PARTIAL')
    : payments;

  async function handleGenerate() {
    if (periodId === null || !period) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await generatePayments(periodId);
      const parts = [`${result.created}건 생성`];
      if (result.skipped > 0) parts.push(`${result.skipped}건은 이미 있어 건너뜀`);
      if (result.proratedStudents.length > 0) {
        parts.push(`일할계산 ${result.proratedStudents.length}명`);
      }
      setNotice(parts.join(' · '));
      setReloadKey((k) => k + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '청구서 생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRecord(row: Payment, raw: string) {
    const paidAmount = Number(raw.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(paidAmount) || paidAmount === row.paidAmount) return;

    setPayments((current) => current.map((p) => (p.id === row.id ? { ...p, paidAmount } : p)));
    try {
      const updated = await recordPayment(row.id, paidAmount);
      setPayments((current) => current.map((p) => (p.id === row.id ? updated : p)));
      setError(null);
    } catch (caught) {
      setPayments((current) => current.map((p) => (p.id === row.id ? row : p)));
      setError(
        caught instanceof ApiError ? caught.message : `${row.student.name} 입금 기록에 실패했습니다.`,
      );
    }
  }

  async function handleCreatePeriod() {
    if (!newMonth) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const period = await createPeriod(deriveTuitionPeriod(newMonth));
      setPeriods((current) => [period, ...current]);
      setPeriodId(period.id);
      setCreating(false);
      setNotice(`${period.label} 주기를 만들었습니다. 이어서 청구서를 생성하세요.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '청구 주기 생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund(row: Payment) {
    if (periodId === null) return;
    setError(null);
    try {
      setRefund(await fetchRefundStatus(row.studentId, periodId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '환불 시점을 불러오지 못했습니다.');
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">학원비</h1>
          <p className="mt-1 text-sm text-muted">
            {period
              ? `${shortDate(period.startDate)} ~ ${shortDate(period.endDate)} · 납부기한 ${shortDate(period.dueDate)}`
              : '청구 주기를 선택하세요'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodId ?? ''}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            aria-label="청구 주기"
            disabled={loadingPeriods || periods.length === 0}
            className={inputClass}
          >
            {periods.length === 0 && <option value="">주기 없음</option>}
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCreating((v) => !v)}
            className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            새 주기
          </button>
          <button
            onClick={handleGenerate}
            disabled={busy || periodId === null}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '생성 중…' : '청구서 일괄 생성'}
          </button>
        </div>
      </div>

      {creating && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="font-semibold">새 청구 주기</h2>
          <p className="mt-1 text-sm text-muted">
            정규반은 16일부터 다음 달 15일까지를 한 달로 봅니다. 달만 고르면 나머지는 자동으로
            정해집니다.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
              aria-label="청구할 달"
              className={inputClass}
            />
            {newMonth && (
              <span className="font-mono text-sm text-muted tabular-nums">
                {deriveTuitionPeriod(newMonth).label} · {shortDate(deriveTuitionPeriod(newMonth).startDate)}{' '}
                ~ {shortDate(deriveTuitionPeriod(newMonth).endDate)} · 납부기한{' '}
                {shortDate(deriveTuitionPeriod(newMonth).dueDate)}
              </span>
            )}
            <button
              onClick={handleCreatePeriod}
              disabled={busy || !newMonth}
              className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? '만드는 중…' : '주기 만들기'}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
          청구 <span className="font-mono font-semibold tabular-nums">{formatWon(summary.total)}</span>원
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
          수납{' '}
          <span className="font-mono font-semibold tabular-nums">{formatWon(summary.collected)}</span>원
        </span>
        <span className="rounded-full border border-danger/30 bg-danger-surface px-3 py-1 text-sm text-danger">
          미납 {summary.unpaidCount}명{' '}
          <span className="font-mono font-semibold tabular-nums">
            {formatWon(summary.unpaidAmount)}
          </span>
          원
        </span>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyUnpaid}
            onChange={(e) => setOnlyUnpaid(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          미납만 보기
        </label>
      </div>

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

      {refund && refund.period.id === periodId && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              {refund.student.name} · 환불 가능 시점
              <span className="ml-2 text-sm font-normal text-muted">
                교습기간 {refund.totalDays}일
              </span>
            </h2>
            <button
              onClick={() => setRefund(null)}
              className="text-sm text-muted underline-offset-2 hover:underline"
            >
              닫기
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            <li>
              <strong>2/3 환불</strong> — {refund.twoThirdsUntil} 까지 통보 시
            </li>
            <li>
              <strong>1/2 환불</strong> — {refund.halfUntil} 까지 통보 시
            </li>
            <li className="text-muted">그 이후 통보 시 환불 없음</li>
          </ul>
          <p className="mt-2 text-xs text-muted">
            금액은 계산하지 않습니다. 환불 여부와 금액은 원장님이 판단합니다.
          </p>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-3xl text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wider text-muted uppercase">
              <th className="px-4 py-3 font-semibold">좌석</th>
              <th className="px-4 py-3 font-semibold">이름</th>
              <th className="px-4 py-3 text-right font-semibold">청구액</th>
              <th className="px-4 py-3 text-right font-semibold">입금액</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3 font-semibold">환불</th>
            </tr>
          </thead>
          <tbody>
            {loadingPayments && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            )}

            {!loadingPayments && !error && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {payments.length === 0
                    ? '아직 청구서가 없습니다. 청구서 일괄 생성을 눌러주세요.'
                    : '미납인 원생이 없습니다.'}
                </td>
              </tr>
            )}

            {!loadingPayments &&
              visible.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.student.seatNo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{row.student.name}</span>
                    {row.student.gender && (
                      <span className="ml-1.5 text-xs text-muted">
                        {GENDER_LABEL[row.student.gender]}
                      </span>
                    )}
                    {row.proratedDays !== null && (
                      <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs text-muted">
                        일할 {row.proratedDays}일
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatWon(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      defaultValue={row.paidAmount === 0 ? '' : String(row.paidAmount)}
                      placeholder="0"
                      aria-label={`${row.student.name} 입금액`}
                      onBlur={(e) => handleRecord(row, e.target.value)}
                      // 칸을 벗어나지 않고 Enter만 눌러도 저장되게 한다.
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="w-28 rounded-md border border-border bg-background px-2 py-1 text-right font-mono text-sm tabular-nums outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRefund(row)}
                      className="text-xs text-muted underline-offset-2 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      시점 보기
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        입금액은 Enter를 누르거나 칸을 벗어나면 저장됩니다. 청구액 이상이면 완납, 일부면 부분납으로
        자동 판정됩니다.
      </p>
    </AdminShell>
  );
}
