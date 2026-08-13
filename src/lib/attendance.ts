import { api } from './api';
import type { Gender } from './students';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export type AttendanceRow = {
  studentId: number;
  seatNo: string | null;
  name: string;
  gender: Gender | null;
  className: string | null;
  attendance: {
    id: number;
    status: AttendanceStatus;
    checkInAt: string | null;
    note: string | null;
  } | null;
};

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: '출석',
  LATE: '지각',
  ABSENT: '결석',
  EXCUSED: '인정',
};

export const STATUS_ORDER: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

export function fetchAttendance(date: string): Promise<AttendanceRow[]> {
  return api<AttendanceRow[]>(`/attendance/?date=${date}`);
}

export function markAttendance(studentId: number, date: string, status: AttendanceStatus) {
  return api('/attendance', {
    method: 'POST',
    body: JSON.stringify({ studentId, date, status }),
  });
}

export function markAttendanceBulk(
  date: string,
  records: { studentId: number; status: AttendanceStatus }[],
) {
  return api<{ count: number }>('/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify({ date, records }),
  });
}

/** 학원은 한국 시간으로 돌아간다. 서버가 UTC여도 날짜가 밀리지 않게 한다. */
export function todayInKst(): string {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function shiftDate(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  return `${date.slice(5).replace('-', '월 ')}일 (${WEEKDAY[d.getUTCDay()]})`;
}
