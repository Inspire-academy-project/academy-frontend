import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '인스파이어 독학재수학원 관리',
  description: '출결·급식·학원비를 한 곳에서 관리합니다.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
