'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  ACTION_LABEL,
  type KioskResult,
  UNKNOWN,
  checkDevice,
  clearDeviceToken,
  punch,
  setDeviceToken,
  useDeviceToken,
} from '@/lib/kiosk';

const MAX_CODE_LENGTH = 6;
/** 결과를 띄워 두는 시간. 다음 학생이 바로 누를 수 있어야 한다. */
const RESULT_MS = 4000;
/** 기기 해제를 누를 의도 없이 스치는 일이 없도록 길게 잡는다. */
const LONG_PRESS_MS = 2000;

export default function KioskPage() {
  const token = useDeviceToken();

  // 서버에서는 이 기기에 무엇이 저장돼 있는지 알 수 없다.
  // 등록 화면을 잠깐 보여줬다 바꾸지 않도록 빈 화면으로 둔다.
  if (token === UNKNOWN) {
    return <main className="flex flex-1 items-center justify-center" />;
  }

  if (!token) {
    return <DeviceSetup />;
  }

  return <Keypad token={token} />;
}

/* ---------- 기기 등록 ---------- */

function DeviceSetup() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const token = value.trim();
    if (!token || busy) return;

    setBusy(true);
    setError(null);
    try {
      // 저장하기 전에 서버에 물어본다. 틀린 값을 넣어 두면
      // 학생이 번호를 누르고 나서야 알게 된다.
      await checkDevice(token);
      setDeviceToken(token);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : '서버에 연결하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <h1 className="text-xl font-bold tracking-tight">출결 기기 등록</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          이 패드에서 출결을 받으려면 학원에서 발급한 값을 한 번 넣어 주세요.
          <br />
          등록해 두면 다음부터는 바로 번호 화면이 열립니다.
        </p>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          aria-label="기기 등록 값"
          placeholder="학원에서 받은 값"
          className="mt-6 w-full rounded-lg border border-border bg-surface px-4 py-3 font-mono outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
        />

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || value.trim().length === 0}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? '확인 중…' : '등록'}
        </button>
      </form>
    </main>
  );
}

/* ---------- 번호 입력 ---------- */

type Feedback =
  | { kind: 'ok'; result: KioskResult }
  | { kind: 'error'; message: string };

function Keypad({ token }: { token: string }) {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [askReset, setAskReset] = useState(false);

  const submit = useCallback(async () => {
    if (busy || code.length < 2) return;

    setBusy(true);
    try {
      const result = await punch(code, token);
      setFeedback({ kind: 'ok', result });
      setCode('');
    } catch (caught) {
      setFeedback({
        kind: 'error',
        message:
          caught instanceof ApiError ? caught.message : '서버에 연결하지 못했습니다.',
      });
      setCode('');
    } finally {
      setBusy(false);
    }
  }, [busy, code, token]);

  // 결과는 잠깐만 보여주고 지운다. 다음 학생에게 남의 이름이 보이면 안 된다.
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), RESULT_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  // 패드에 키보드를 물려 쓰는 경우가 있어 숫자키도 받는다.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key >= '0' && event.key <= '9') {
        setCode((current) => (current.length >= MAX_CODE_LENGTH ? current : current + event.key));
      } else if (event.key === 'Backspace') {
        setCode((current) => current.slice(0, -1));
      } else if (event.key === 'Enter') {
        void submit();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [submit]);

  function press(digit: string) {
    setFeedback(null);
    setCode((current) => (current.length >= MAX_CODE_LENGTH ? current : current + digit));
  }

  return (
    <main className="flex flex-1 select-none flex-col px-6 py-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">출결</h1>
          <p className="mt-1 text-sm text-muted">번호를 누르고 확인을 눌러 주세요</p>
        </div>
        <LongPressClock onLongPress={() => setAskReset(true)} />
      </div>

      <div
        aria-live="polite"
        className="mt-6 flex min-h-28 flex-col items-center justify-center rounded-xl border border-border bg-surface px-4 py-5 text-center"
      >
        {feedback?.kind === 'ok' && (
          <>
            <p className="text-3xl font-bold tracking-tight">{feedback.result.name}</p>
            <p className="mt-1 text-lg text-muted">
              {ACTION_LABEL[feedback.result.action]}{' '}
              <span className="font-mono font-semibold text-foreground">
                {feedback.result.at}
              </span>
            </p>
          </>
        )}

        {feedback?.kind === 'error' && (
          <p role="alert" className="text-lg font-semibold text-danger">
            {feedback.message}
          </p>
        )}

        {!feedback && (
          <p className="font-mono text-5xl tracking-[0.3em] tabular-nums">
            {code || <span className="text-muted">— — — —</span>}
          </p>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="grid w-full max-w-sm grid-cols-3 gap-3 py-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <KeyButton key={digit} onClick={() => press(digit)}>
              {digit}
            </KeyButton>
          ))}

          <KeyButton
            onClick={() => setCode((c) => c.slice(0, -1))}
            muted
            aria-label="한 글자 지우기"
          >
            ←
          </KeyButton>
          <KeyButton onClick={() => press('0')}>0</KeyButton>
          <KeyButton onClick={submit} disabled={busy || code.length < 2} accent>
            확인
          </KeyButton>
        </div>
      </div>

      {askReset && (
        <ResetDialog
          onCancel={() => setAskReset(false)}
          onConfirm={() => {
            setAskReset(false);
            clearDeviceToken();
          }}
        />
      )}
    </main>
  );
}

function KeyButton({
  children,
  onClick,
  disabled,
  accent,
  muted,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  muted?: boolean;
} & Omit<React.ComponentProps<'button'>, 'children' | 'onClick' | 'disabled'>) {
  const tone = accent
    ? 'bg-accent text-white hover:bg-accent-hover'
    : muted
      ? 'border border-border text-muted hover:bg-surface'
      : 'border border-border bg-surface hover:bg-background';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`aspect-[5/4] touch-manipulation rounded-xl text-2xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * 지금 시각. 학생이 늦었는지 스스로 알 수 있게 띄워 둔다.
 * 길게 누르면 기기 등록을 해제한다. 학생이 지나가다 누르는 일이 없도록
 * 눈에 띄는 버튼 대신 길게 누르기로 숨겨 뒀다.
 */
function LongPressClock({ onLongPress }: { onLongPress: () => void }) {
  const [now, setNow] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      );

    tick();
    const interval = setInterval(tick, 10_000);
    return () => clearInterval(interval);
  }, []);

  function start() {
    timer.current = setTimeout(onLongPress, LONG_PRESS_MS);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="현재 시각 (길게 누르면 기기 설정)"
      className="font-mono text-lg tabular-nums text-muted"
    >
      {now ?? '--:--'}
    </button>
  );
}

function ResetDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kiosk-reset-title"
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5"
      >
        <h2 id="kiosk-reset-title" className="font-semibold">
          이 기기의 출결 등록을 해제할까요?
        </h2>
        <p className="mt-2 text-sm text-muted">
          해제하면 다시 등록하기 전까지 이 패드에서 출결을 받을 수 없습니다.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-danger px-4 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            해제
          </button>
        </div>
      </div>
    </div>
  );
}
