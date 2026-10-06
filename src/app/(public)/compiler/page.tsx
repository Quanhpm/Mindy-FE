import type { Metadata } from 'next';
import Link from 'next/link';
import { CompilerPlayground } from '@/features/compiler/client';
import { Brand } from '@/shared/ui/brand';

export const metadata: Metadata = {
  title: 'Test compiler',
  robots: { index: false, follow: false },
};
export default function CompilerPage() {
  return (
    <main id="main-content" className="content compiler-page">
      <header className="compiler-header">
        <Brand />
        <Link href="/" className="button button-secondary">
          ← Về trang chủ
        </Link>
      </header>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MINDY PLAYGROUND</p>
          <h1>Test compiler</h1>
          <p className="page-description">
            Viết và chạy JavaScript với code mẫu hoặc dữ liệu stdin của bạn.
          </p>
        </div>
      </div>
      <CompilerPlayground />
    </main>
  );
}
