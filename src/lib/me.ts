import { api } from './api';
import type { AttendanceStatus } from './attendance';
import type { BillingPeriod, PaymentStatus } from './payments';

/**
 * 학생이 보는 자기 기록.
 * 서버가 토큰에서 학생을 찾으므로 studentId를 보내지 않는다.
 */
export type MyAttendance = {
  id: number;
  date: string;
  status: AttendanceStatus;
  /** 키오스크가 찍은 시각. 관리자가 상태를 바꿔도 지워지지 않는다. */
  checkInAt: string | null;
  checkOutAt: string | null;
  note: string | null;
};

export type MyPayment = {
  id: number;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  proratedDays: number | null;
  paidAt: string | null;
  memo: string | null;
  period: BillingPeriod;
};

export function fetchMyAttendance(from: string, to: string): Promise<MyAttendance[]> {
  return api<MyAttendance[]>(`/attendance/me?from=${from}&to=${to}`);
}

export function fetchMyPayments(): Promise<MyPayment[]> {
  return api<MyPayment[]>('/payments/me');
}

/* ---------- 월 다루기 ---------- */

/** 학원은 한국 시간으로 돌아간다. 자정 무렵에 달이 밀리지 않게 한다. */
export function currentMonth(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 7);
}

/** 2026-08 -> 2026-07 (delta -1) */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const moved = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 그 달의 1일과 말일. 말일은 다음 달 0일로 구한다. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, '0')}`,
  };
}

/** 2026-08 -> 2026년 8월 */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${year}년 ${m}월`;
}

/** 2026-08-14T00:00:00.000Z -> 8월 14일 (금) */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${weekday})`;
}
