'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { type InviteCheck, registerWithCode, verifyInviteCode } from '@/lib/auth';

const inputClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30';

export default function RegisterPage() {
  const [code, setCode] = useState('');
  const [checked, setChecked] = useState<InviteCheck | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * 코드를 먼저 확인해 어느 원생으로 연결되는지 이름을 보여준다.
   * 남의 코드를 받아 적었을 때 가입을 마치기 전에 알아채야 한다.
   */
  async function handleCheck(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      setChecked(await verifyInviteCode(code.trim()));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '서버에 연결하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const { user } = await registerWithCode(code.trim(), email.trim(), password);
      setDone(user.name);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '서버에 연결하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Inspire Academy</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">학생 가입</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            학원에서 받은 가입 코드가 필요합니다.
            <br />
            코드가 없으면 원장님께 요청하세요.
          </p>
        </div>

        {done ? (
          <Done name={done} />
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
            {/* 1단계 — 코드 확인 */}
            {!checked ? (
              <form onSubmit={handleCheck} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="code" className="text-sm font-medium">
                    가입 코드
                  </label>
                  <input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    autoFocus
                    autoComplete="off"
                    placeholder="A7K2-9QX4"
                    className={`${inputClass} text-center font-mono text-lg tracking-widest uppercase`}
                  />
                  <p className="text-xs text-muted">
                    대소문자와 하이픈은 신경 쓰지 않아도 됩니다.
                  </p>
                </div>

                {error && <ErrorText>{error}</ErrorText>}

                <button
                  type="submit"
                  disabled={busy || code.trim().length < 4}
                  className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? '확인 중…' : '다음'}
                </button>
              </form>
            ) : (
              /* 2단계 — 계정 만들기 */
              <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
                <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-3 text-sm">
                  <strong className="font-semibold">{checked.name}</strong> 학생으로 가입합니다.
                  <br />
                  <span className="text-muted">본인이 아니면 원장님께 확인하세요.</span>
                </p>

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
                    autoFocus
                    autoComplete="username"
                    className={inputClass}
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
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <p className="text-xs text-muted">8자 이상</p>
                </div>

                {error && <ErrorText>{error}</ErrorText>}

                <button
                  type="submit"
                  disabled={busy || !email || password.length < 8}
                  className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? '가입 중…' : '가입하기'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChecked(null);
                    setError(null);
                  }}
                  className="text-xs text-muted underline underline-offset-4 hover:text-foreground"
                >
                  코드 다시 입력
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          이미 계정이 있나요?{' '}
          <Link href="/login" className="text-accent underline underline-offset-4">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
    >
      {children}
    </p>
  );
}

/**
 * 가입하면서 토큰이 저장되므로 바로 내 화면으로 들어갈 수 있다.
 * 자동으로 넘기지 않는 이유는 어느 원생과 이어졌는지 확인할 시간을 주기 위함이다.
 */
function Done({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="font-semibold">가입이 끝났습니다</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <strong className="text-foreground">{name}</strong> 학생 계정이 만들어졌고, 학원에 등록된
        출결·납부 기록과 이어졌습니다.
      </p>
      <Link
        href="/me"
        className="mt-4 block rounded-md bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        내 출결·납부 보기
      </Link>
    </div>
  );
}
