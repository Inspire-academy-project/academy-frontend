'use client';

import { useSyncExternalStore } from 'react';
import { api } from './api';

/**
 * 출결 패드는 로그인을 할 수 없다. 대신 관리자가 한 번 등록해 둔 값을
 * 기기에 저장하고, 매 요청마다 헤더로 보낸다.
 * 이 값을 아는 기기에서만 출결이 찍힌다.
 */
const DEVICE_TOKEN_KEY = 'academy_kiosk_token';

/** 서버에서는 기기에 무엇이 저장돼 있는지 알 수 없다. 등록 여부와 구분한다. */
export const UNKNOWN = Symbol('kiosk-device-token-unknown');

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // 관리자가 다른 탭에서 등록을 지우는 경우도 따라간다.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function read(): string | null {
  return window.localStorage.getItem(DEVICE_TOKEN_KEY);
}

/** 등록된 값. 아직 읽기 전이면 UNKNOWN, 등록되지 않았으면 null. */
export function useDeviceToken(): string | null | typeof UNKNOWN {
  return useSyncExternalStore<string | null | typeof UNKNOWN>(subscribe, read, () => UNKNOWN);
}

export function setDeviceToken(token: string): void {
  window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
  notify();
}

export function clearDeviceToken(): void {
  window.localStorage.removeItem(DEVICE_TOKEN_KEY);
  notify();
}

/** IN = 등원, OUT = 하원. 그날 첫 입력만 IN 이다. */
export type KioskAction = 'IN' | 'OUT';

export type KioskResult = {
  name: string;
  action: KioskAction;
  /** 08:52 처럼 한국 시각의 시·분. 서버가 만들어 준다. */
  at: string;
};

export const ACTION_LABEL: Record<KioskAction, string> = {
  IN: '등원',
  OUT: '하원',
};

/** 토큰이 맞는지 확인한다. 등록 화면에서 그 자리에 알려주기 위함이다. */
export function checkDevice(token: string): Promise<{ ok: true }> {
  return api<{ ok: true }>('/attendance/kiosk', {
    headers: { 'X-Kiosk-Token': token },
  });
}

export function punch(code: string, token: string): Promise<KioskResult> {
  return api<KioskResult>('/attendance/kiosk', {
    method: 'POST',
    headers: { 'X-Kiosk-Token': token },
    body: JSON.stringify({ code }),
  });
}
