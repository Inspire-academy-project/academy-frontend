import { api } from './api';
import type { PaymentStatus } from './payments';
import type { Gender } from './students';

export type MealType = 'LUNCH' | 'DINNER';

export const MEAL_LABEL: Record<MealType, string> = {
  LUNCH: '점심',
  DINNER: '저녁',
};

export const MEAL_TYPES: MealType[] = ['LUNCH', 'DINNER'];

/** 매뉴얼 기준 한 끼 단가. 서버가 최종 판단하며 화면에서는 안내용으로만 쓴다. */
export const UNIT_PRICE = 7_500;

type MealStudent = {
  id: number;
  seatNo: string | null;
  name: string;
  gender: Gender | null;
};

/* ---------- 수령표 ---------- */

export type MealRecordRow = {
  studentId: number;
  seatNo: string | null;
  name: string;
  received: boolean;
};

export type MealRecordSheet = {
  operating: boolean;
  note?: string | null;
  reservedCount?: number;
  receivedCount?: number;
  items: MealRecordRow[];
};

export function fetchMealRecords(date: string, mealType: MealType): Promise<MealRecordSheet> {
  return api<MealRecordSheet>(`/meals/records?date=${date}&mealType=${mealType}`);
}

export function markMealReceived(
  studentId: number,
  date: string,
  mealType: MealType,
  received: boolean,
) {
  return api('/meals/records', {
    method: 'POST',
    body: JSON.stringify({ studentId, date, mealType, received }),
  });
}

/* ---------- 신청 (주방 전달용 수량) ---------- */

export type ReservationSheet = {
  date: string;
  mealType: MealType;
  count: number;
  items: { studentId: number; student: MealStudent }[];
};

export function fetchReservations(date: string, mealType: MealType): Promise<ReservationSheet> {
  return api<ReservationSheet>(`/meals/reservations?date=${date}&mealType=${mealType}`);
}

/* ---------- 월별 후불 정산 ---------- */

export type MealSettlement = {
  id: number;
  studentId: number;
  year: number;
  month: number;
  mealType: MealType;
  servedCount: number;
  unitPrice: number;
  amount: number;
  method: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  memo: string | null;
  student: MealStudent;
};

export type SettlementSheet = {
  summary: {
    totalServed: number;
    totalAmount: number;
    unpaidCount: number;
    unpaidAmount: number;
  };
  items: MealSettlement[];
};

export function fetchSettlements(
  year: number,
  month: number,
  mealType?: MealType,
): Promise<SettlementSheet> {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (mealType) params.set('mealType', mealType);
  return api<SettlementSheet>(`/meals/settlements?${params}`);
}

export type GenerateSettlementResult = {
  year: number;
  month: number;
  mealType: MealType;
  unitPrice: number;
  created: number;
  updated: number;
  skippedPaid: number;
};

export function generateSettlements(
  year: number,
  month: number,
  mealType: MealType,
): Promise<GenerateSettlementResult> {
  return api<GenerateSettlementResult>('/meals/settlements/generate', {
    method: 'POST',
    body: JSON.stringify({ year, month, mealType }),
  });
}

export function updateSettlement(
  id: number,
  body: { status?: PaymentStatus; method?: string | null },
): Promise<MealSettlement> {
  return api<MealSettlement>(`/meals/settlements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/* ---------- 급식 미운영일 ---------- */

export function setServiceDay(date: string, mealType: MealType, operating: boolean, note?: string) {
  return api('/meals/service-days', {
    method: 'POST',
    body: JSON.stringify({ date, mealType, operating, note }),
  });
}
