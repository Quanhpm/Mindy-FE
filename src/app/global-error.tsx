'use client';

import './globals.css';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <main id="main-content" className="standalone-state">
          <p className="eyebrow">MINDY CENTER</p>
          <h1>Mindy tạm thời chưa sẵn sàng</h1>
          <p>Vui lòng tải lại trang để tiếp tục.</p>
          <button className="button button-primary" type="button" onClick={reset}>
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
