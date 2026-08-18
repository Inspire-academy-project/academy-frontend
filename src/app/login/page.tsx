'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/me');
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { user } = await login(email.trim(), password);
      // 학생과 관리자는 볼 화면이 다르다. 서로의 화면은 권한이 없어 되튕긴다.
      router.replace(user.role === 'STUDENT' ? '/me' : '/dashboard');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError('서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.');
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Inspire Academy</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">로그인</h1>
          <p className="mt-2 text-sm text-muted">
            원장·강사는 관리 화면으로, 학생은 내 출결·납부 화면으로 들어갑니다.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              placeholder="admin@academy.kr"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="mt-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          학원에서 가입 코드를 받으셨나요?{' '}
          <Link href="/register" className="text-accent underline underline-offset-4">
            학생 가입
          </Link>
        </p>
      </div>
    </main>
  );
}
