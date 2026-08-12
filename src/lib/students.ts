import { api } from './api';

export type Gender = 'MALE' | 'FEMALE';

export type Student = {
  id: number;
  seatNo: string | null;
  name: string;
  gender: Gender | null;
  course: string | null;
  className: string | null;
  phone: string | null;
  parentPhone: string | null;
  attendanceCode: string | null;
  enrolledAt: string;
  active: boolean;
};

export type StudentFilter = {
  q?: string;
  gender?: Gender | '';
  active?: 'true' | 'false' | '';
};

export const GENDER_LABEL: Record<Gender, string> = {
  MALE: '남',
  FEMALE: '여',
};

export function fetchStudents(filter: StudentFilter = {}): Promise<Student[]> {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.gender) params.set('gender', filter.gender);
  if (filter.active) params.set('active', filter.active);

  const query = params.toString();
  return api<Student[]>(`/students${query ? `?${query}` : ''}`);
}

export type NewStudent = {
  name: string;
  seatNo?: string;
  gender?: Gender;
  course?: string;
  className?: string;
  phone?: string;
  parentPhone?: string;
  attendanceCode?: string;
  enrolledAt: string;
  memo?: string;
};

export function createStudent(body: NewStudent): Promise<Student> {
  return api<Student>('/students', { method: 'POST', body: JSON.stringify(body) });
}

/** 2026-03-16T00:00:00.000Z -> 2026-03-16 */
export function formatDate(value: string): string {
  return value.slice(0, 10);
}
