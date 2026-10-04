import type { Metadata } from 'next';
import Link from 'next/link';
import { CompilerPlayground } from '@/features/compiler/client';

export const metadata: Metadata = {
  title: 'Test compiler',
  robots: { index: false, follow: false },
};
export default function CompilerPage() {
  return (
    <main id="main-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/">← Về trang chủ</Link>
      <header style={{ margin: '32px 0' }}>
        <p className="eyebrow">MINDY PLAYGROUND</p>
        <h1>Test compiler</h1>
        <p>Viết và chạy JavaScript với code mẫu hoặc dữ liệu stdin của bạn.</p>
      </header>
      <CompilerPlayground />
    </main>
  );
}
