'use client';

import { ErrorPanel } from '@/shared/components/feedback';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="standalone-state">
      <h1>Trang tạm thời chưa sẵn sàng</h1>
      <ErrorPanel message="Có lỗi khi tải nội dung. Bạn có thể thử lại." retry={reset} />
    </main>
  );
}
