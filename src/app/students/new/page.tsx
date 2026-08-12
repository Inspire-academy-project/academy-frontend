'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { ApiError } from '@/lib/api';
import { type NewStudent, createStudent } from '@/lib/students';

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30';

function today(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export default function NewStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    seatNo: '',
    gender: '',
    course: '재수',
    attendanceCode: '',
    phone: '',
    parentPhone: '',
    enrolledAt: today(),
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const body: NewStudent = {
      name: form.name.trim(),
      enrolledAt: form.enrolledAt,
      seatNo: form.seatNo.trim() || undefined,
      gender: (form.gender || undefined) as NewStudent['gender'],
      course: form.course.trim() || undefined,
      attendanceCode: form.attendanceCode.trim() || undefined,
      phone: form.phone.trim() || undefined,
      parentPhone: form.parentPhone.trim() || undefined,
    };

    try {
      await createStudent(body);
      router.push('/students');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '등록에 실패했습니다.');
      setSubmitting(false);
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-xl font-bold tracking-tight">원생 등록</h1>
        <p className="mt-1 text-sm text-muted">이름과 등원일만 필수입니다.</p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              이름 <span className="text-danger">*</span>
            </label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="seatNo" className="text-sm font-medium">
                좌석번호
              </label>
              <input
                id="seatNo"
                value={form.seatNo}
                onChange={(e) => update('seatNo', e.target.value)}
                placeholder="M01"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="gender" className="text-sm font-medium">
                성별
              </label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                <option value="MALE">남</option>
                <option value="FEMALE">여</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="course" className="text-sm font-medium">
                과정
              </label>
              <input
                id="course"
                value={form.course}
                onChange={(e) => update('course', e.target.value)}
                placeholder="재수"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="attendanceCode" className="text-sm font-medium">
                출결번호
              </label>
              <input
                id="attendanceCode"
                value={form.attendanceCode}
                onChange={(e) => update('attendanceCode', e.target.value)}
                inputMode="numeric"
                placeholder="1001"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium">
                학생 연락처
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="010-0000-0000"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="parentPhone" className="text-sm font-medium">
                학부모 연락처
              </label>
              <input
                id="parentPhone"
                type="tel"
                value={form.parentPhone}
                onChange={(e) => update('parentPhone', e.target.value)}
                placeholder="010-0000-0000"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="enrolledAt" className="text-sm font-medium">
              등원일 <span className="text-danger">*</span>
            </label>
            <input
              id="enrolledAt"
              type="date"
              value={form.enrolledAt}
              onChange={(e) => update('enrolledAt', e.target.value)}
              required
              className={inputClass}
            />
            <p className="text-xs text-muted">학원비 일할계산의 기준이 되는 날짜입니다.</p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <div className="mt-1 flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.name || !form.enrolledAt}
              className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '등록 중…' : '등록'}
            </button>
            <Link
              href="/students"
              className="rounded-md border border-border px-4 py-2.5 text-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
