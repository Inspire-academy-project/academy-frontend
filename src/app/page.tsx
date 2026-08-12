'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted">불러오는 중…</p>
    </main>
  );
}
