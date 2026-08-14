'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  type IssuedInvite,
  type StudentAccount,
  fetchStudentAccount,
  formatDay,
  issueInvite,
} from '@/lib/students';

type Props = {
  studentId: number;
  studentName: string;
  onClose: () => void;
};

/**
 * 원생과 로그인 계정을 잇는 창.
 *
 * 원생 상세 화면이 따로 없고, 정적 내보내기라 /students/[id] 같은 동적 경로를
 * 만들 수 없어 목록에서 창으로 연다.
 */
export function StudentAccountDialog({ studentId, studentName, onClose }: Props) {
  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [issued, setIssued] = useState<IssuedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchStudentAccount(studentId)
      .then((loaded) => {
        if (!cancelled) setAccount(loaded);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError ? caught.message : '계정 상태를 불러오지 못했습니다.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleIssue() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setIssued(await issueInvite(studentId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '코드를 발급하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const linked = account?.user ?? null;
  const pending = account?.pendingInvite ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6"
      >
        <h2 id="account-dialog-title" className="text-lg font-bold tracking-tight">
          {studentName} 계정
        </h2>

        {!account && !error && <p className="mt-4 text-sm text-muted">불러오는 중…</p>}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {account && linked && (
          <p className="mt-4 rounded-md border border-border bg-background px-3 py-3 text-sm">
            계정이 연결되어 있습니다.
            <br />
            <span className="font-mono text-xs text-muted">{linked.email}</span>
          </p>
        )}

        {account && !linked && !issued && (
          <>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              가입 코드를 만들어 학생에게 전달하세요. 학생이 그 코드로 가입하면 이 원생에
              연결됩니다. 코드는 <strong className="text-foreground">7일</strong> 동안, 한 번만
              쓸 수 있습니다.
            </p>

            {pending && (
              <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
                이미 발급한 코드가 있습니다 ({formatDay(pending.expiresAt)}까지).
                <br />
                다시 만들면 <strong className="text-foreground">그 코드는 못 쓰게 됩니다.</strong>
              </p>
            )}

            <button
              onClick={handleIssue}
              disabled={busy}
              className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? '만드는 중…' : pending ? '코드 다시 만들기' : '가입 코드 만들기'}
            </button>
          </>
        )}

        {issued && <IssuedCode invite={issued} />}

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

/**
 * 코드 원문은 서버가 해시로 저장하므로 이 순간에만 볼 수 있다.
 * 창을 닫으면 다시 못 보니, 복사 버튼을 크게 두고 경고를 함께 띄운다.
 */
function IssuedCode({ invite }: { invite: IssuedInvite }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="mt-4">
      <p className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger">
        이 코드는 지금만 보입니다. 창을 닫으면 다시 볼 수 없으니 복사해서 전달하세요.
      </p>

      <p className="mt-3 rounded-lg border border-border bg-background px-4 py-4 text-center font-mono text-2xl font-bold tracking-widest select-all">
        {invite.code}
      </p>

      <p className="mt-2 text-center text-xs text-muted">
        {formatDay(invite.expiresAt)}까지 · 한 번만 사용 가능
      </p>

      <button
        onClick={handleCopy}
        className="mt-3 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {copied ? '복사했습니다' : '코드 복사'}
      </button>

      {copyFailed && (
        <p className="mt-2 text-center text-xs text-danger">
          복사하지 못했습니다. 코드를 직접 선택해 복사해 주세요.
        </p>
      )}
    </div>
  );
}
