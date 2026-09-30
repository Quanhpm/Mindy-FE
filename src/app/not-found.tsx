import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="standalone-state">
      <p className="eyebrow">404 · MINDY</p>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.</p>
      <Link href="/" className="button button-primary">
        Về trang chủ
      </Link>
    </main>
  );
}
