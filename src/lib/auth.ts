'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken, getToken, setToken } from './api';

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  student: { id: number; seatNo: string | null; className: string | null; active: boolean } | null;
};

type LoginResponse = {
  user: { id: number; email: string; name: string; role: Role };
  token: string;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(result.token);
  return result;
}

export function logout(): void {
  clearToken();
}

/* ---------- 가입 ---------- */

/**
 * 가입은 원장이 발급한 코드로만 된다. 코드가 없으면 서버가 막는다.
 * 명부에 있는 원생과 이어지지 않은 계정이 생기면 자기 출결·납부가 안 보인다.
 */
export type InviteCheck = {
  /** 이 코드가 연결될 원생 이름. 남의 코드로 가입하는 사고를 막기 위해 보여준다. */
  name: string;
  expiresAt: string;
};

/** 코드가 주소에 남지 않도록 서버도 POST로 받는다. */
export function verifyInviteCode(code: string): Promise<InviteCheck> {
  return api<InviteCheck>('/auth/invite/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function registerWithCode(
  code: string,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const result = await api<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ code, email, password }),
  });
  setToken(result.token);
  return result;
}

/**
 * 로그인한 사용자를 불러온다. 토큰이 없거나 만료됐으면 로그인 화면으로 보낸다.
 * 서버가 최종 판정하므로 이 검사는 화면 편의를 위한 것이다.
 */
export function useRequireAuth(allowedRoles?: Role[]) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      router.replace('/login');
      return;
    }

    api<CurrentUser>('/auth/me')
      .then((me) => {
        if (cancelled) return;
        if (allowedRoles && !allowedRoles.includes(me.role)) {
          router.replace('/login');
          return;
        }
        setUser(me);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        router.replace('/login');
      });

    return () => {
      cancelled = true;
    };
    // allowedRoles는 매 렌더마다 새 배열이 될 수 있어 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return { user, loading };
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '원장',
  TEACHER: '강사',
  STUDENT: '학생',
};
