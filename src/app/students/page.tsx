'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/admin-shell';
import { StudentAccountDialog } from '@/components/student-account-dialog';
import { ApiError } from '@/lib/api';
import {
  GENDER_LABEL,
  type Student,
  type StudentFilter,
  fetchStudents,
  formatDate,
} from '@/lib/students';

const inputClass =
  'rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30';

export default function StudentsPage() {
  const [filter, setFilter] = useState<StudentFilter>({ q: '', gender: '', active: 'true' });
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountOf, setAccountOf] = useState<Student | null>(null);

  const load = useCallback(async (current: StudentFilter) => {
    setLoading(true);
    setError(null);
    try {
      setStudents(await fetchStudents(current));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : '원생 목록을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // 검색어는 타이핑이 멈춘 뒤에 요청한다.
  useEffect(() => {
    const timer = setTimeout(() => load(filter), filter.q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [filter, load]);

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">원생</h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? '불러오는 중…' : `${students.length}명`}
          </p>
        </div>
        <Link
          href="/students/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          원생 등록
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <input
          type="search"
          value={filter.q}
          onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
          placeholder="이름 또는 좌석번호"
          aria-label="원생 검색"
          className={`${inputClass} min-w-52 flex-1`}
        />
        <select
          value={filter.gender}
          onChange={(e) => setFilter((f) => ({ ...f, gender: e.target.value as never }))}
          aria-label="성별"
          className={inputClass}
        >
          <option value="">성별 전체</option>
          <option value="MALE">남</option>
          <option value="FEMALE">여</option>
        </select>
        <select
          value={filter.active}
          onChange={(e) => setFilter((f) => ({ ...f, active: e.target.value as never }))}
          aria-label="재원 여부"
          className={inputClass}
        >
          <option value="true">재원생</option>
          <option value="false">퇴원생</option>
          <option value="">전체</option>
        </select>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
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
              <th className="px-4 py-3 font-semibold">성별</th>
              <th className="px-4 py-3 font-semibold">과정</th>
              <th className="px-4 py-3 font-semibold">출결번호</th>
              <th className="px-4 py-3 font-semibold">학부모 연락처</th>
              <th className="px-4 py-3 font-semibold">등원일</th>
              <th className="px-4 py-3 font-semibold">계정</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  불러오는 중…
                </td>
              </tr>
            )}

            {!loading && !error && students.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  조건에 맞는 원생이 없습니다.
                </td>
              </tr>
            )}

            {!loading &&
              students.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{student.seatNo ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {student.gender ? GENDER_LABEL[student.gender] : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{student.course ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {student.attendanceCode ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {student.parentPhone ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {formatDate(student.enrolledAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAccountOf(student)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      계정
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {accountOf && (
        <StudentAccountDialog
          studentId={accountOf.id}
          studentName={accountOf.name}
          onClose={() => setAccountOf(null)}
        />
      )}
    </AdminShell>
  );
}
