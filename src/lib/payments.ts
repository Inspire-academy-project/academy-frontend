import { api } from './api';
import type { Gender } from './students';

export type FeeType = 'TUITION' | 'OTHER';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'EXEMPT';

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: '미납',
  PARTIAL: '부분납',
  PAID: '완납',
  EXEMPT: '면제',
};

export type BillingPeriod = {
  id: number;
  feeType: FeeType;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  baseAmount: number | null;
  closed: boolean;
  _count?: { payments: number };
};

export type Payment = {
  id: number;
  studentId: number;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  proratedDays: number | null;
  paidAt: string | null;
  memo: string | null;
  student: {
    id: number;
    seatNo: string | null;
    name: string;
    gender: Gender | null;
    course: string | null;
    parentPhone: string | null;
  };
  period: BillingPeriod;
};

export type GenerateResult = {
  periodLabel: string;
  targetStudents: number;
  created: number;
  skipped: number;
  proratedStudents: {
    seatNo: string | null;
    name: string;
    days: number;
    dailyRate: number | null;
    amount: number;
  }[];
  unknownDailyRate: { seatNo: string | null; monthlyFee: number }[];
};

export type RefundStatus = {
  student: { id: number; seatNo: string | null; name: string };
  period: { id: number; label: string };
  tier: 'FULL' | 'TWO_THIRDS' | 'HALF' | 'NONE';
  label: string;
  elapsedDays: number | null;
  totalDays: number;
  effectiveStart: string;
  twoThirdsUntil: string;
  halfUntil: string;
};

export function fetchPeriods(): Promise<BillingPeriod[]> {
  return api<BillingPeriod[]>('/payments/periods');
}

export type NewPeriod = {
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
};

export function createPeriod(body: NewPeriod): Promise<BillingPeriod> {
  return api<BillingPeriod>('/payments/periods', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function generatePayments(periodId: number): Promise<GenerateResult> {
  return api<GenerateResult>(`/payments/periods/${periodId}/generate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function fetchPayments(periodId: number): Promise<Payment[]> {
  return api<Payment[]>(`/payments/?periodId=${periodId}`);
}

export function recordPayment(id: number, paidAmount: number): Promise<Payment> {
  return api<Payment>(`/payments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ paidAmount }),
  });
}

export function fetchRefundStatus(studentId: number, periodId: number): Promise<RefundStatus> {
  return api<RefundStatus>(`/payments/refund-status?studentId=${studentId}&periodId=${periodId}`);
}

export function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

/**
 * 정규반은 매달 일수와 상관없이 16일부터 다음 달 15일까지를 한 달로 본다.
 * 달만 고르면 나머지가 정해지므로 날짜를 직접 입력하지 않게 한다.
 */
export function deriveTuitionPeriod(yearMonth: string): NewPeriod {
  const [year, month] = yearMonth.split('-').map(Number);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(year, month - 1, 16));
  const end = new Date(Date.UTC(year, month, 15));

  return {
    label: `${year}년 ${month}월`,
    startDate: iso(start),
    endDate: iso(end),
    dueDate: iso(start),
  };
}

/** 오늘이 속한 청구 주기의 다음 달을 기본값으로 준다. */
export function nextYearMonth(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  // 16일 이후면 이번 달 주기가 이미 시작됐으므로 다음 달을 제안한다.
  const offset = kst.getUTCDate() >= 16 ? 1 : 0;
  const target = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + offset, 1));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 2026-09-16 -> 9/16 */
export function shortDate(value: string): string {
  const [, month, day] = value.slice(0, 10).split('-');
  return `${Number(month)}/${Number(day)}`;
}
