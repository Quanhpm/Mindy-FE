'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: 'sans-serif', padding: 48 }}>
        <h1>Mindy tạm thời chưa sẵn sàng</h1>
        <p>Vui lòng tải lại trang để tiếp tục.</p>
        <button type="button" onClick={reset}>
          Thử lại
        </button>
      </body>
    </html>
  );
}
