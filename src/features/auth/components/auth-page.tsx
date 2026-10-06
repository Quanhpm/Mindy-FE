import Link from 'next/link';
import { Brand } from '@/shared/ui/brand';
import styles from './auth-page.module.css';

export function AuthPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <span className={styles.index}>KHÔNG GIAN TÀI KHOẢN</span>
        <Link className={styles.back} href="/">
          ← Về trang chủ
        </Link>
      </header>
      <div className={styles.entry}>
        <aside className={styles.story}>
          <span className={styles.index}>MỘT CHƯƠNG MỚI</span>
          <h2>
            Học hỏi.
            <br />
            Thực hành.
            <br />
            <span className={styles.accent}>Trưởng thành.</span>
          </h2>
          <p>
            Viết tiếp hành trình của bạn,
            <br />
            mỗi ngày một điều mới.
          </p>
          <span className={styles.number} aria-hidden="true">
            01<span>LEARN / CONNECT / GROW</span>
          </span>
        </aside>
        <section className={styles.form}>
          <p className={styles.index}>BẮT ĐẦU CÙNG MINDY</p>
          <h1>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
          <p className={styles.footnote}>Cùng nhau tiến bộ mỗi ngày.</p>
        </section>
      </div>
      <footer className={styles.footer}>
        <span>MINDY CENTER — LEARNING IS A JOURNEY</span>
        <span>HÀNH TRÌNH BẮT ĐẦU TỪ BẠN ↗</span>
      </footer>
    </main>
  );
}
