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

/* ---------- 계정 연결 ---------- */

/**
 * 원생 상세 중 계정 연결에 필요한 부분만 쓴다.
 * 상세 응답에는 납부·출결 내역도 들어 있지만 여기서는 보지 않는다.
 */
export type StudentAccount = {
  id: number;
  name: string;
  active: boolean;
  /** 연결된 로그인 계정. 아직 없으면 null. */
  user: { id: number; email: string } | null;
  /** 발급했지만 아직 쓰지 않은 가입 코드. 코드 자체는 담기지 않는다. */
  pendingInvite: { expiresAt: string; createdAt: string } | null;
};

export function fetchStudentAccount(id: number): Promise<StudentAccount> {
  return api<StudentAccount>(`/students/${id}`);
}

export type IssuedInvite = {
  studentId: number;
  name: string;
  /** 원문은 이 응답에만 실린다. 서버는 해시로 저장해 다시 꺼내주지 않는다. */
  code: string;
  expiresAt: string;
};

export function issueInvite(id: number): Promise<IssuedInvite> {
  return api<IssuedInvite>(`/students/${id}/invite`, { method: 'POST' });
}

/** 2026-08-21T03:10:36.084Z -> 2026년 8월 21일 */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 2026-03-16T00:00:00.000Z -> 2026-03-16 */
export function formatDate(value: string): string {
  return value.slice(0, 10);
}
