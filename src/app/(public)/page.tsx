import Link from 'next/link';
import { HealthCheck } from '@/features/health/client';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <div className={styles.landing}>
      <header className={styles.header}>
        <Brand />
        <nav aria-label="Điều hướng trang chủ" className={styles.headerLinks}>
          <Link href="/courses">Khóa học</Link>
          <Link className="button button-secondary" href="/login">
            Đăng nhập
            <Icon name="arrow" size={17} />
          </Link>
        </nav>
      </header>
      <main id="main-content" className={styles.main}>
        <section className={styles.story}>
          <p className="eyebrow">MINDY LEARNING CENTER</p>
          <h1>
            Một nơi để học.
            <br />
            <span className={styles.emphasis}>Một hành trình để lớn.</span>
          </h1>
          <p>
            Kết nối học viên, mentor và đội ngũ trung tâm trong một không gian chung. Bắt đầu hành
            trình của bạn cùng Mindy.
          </p>
          <Link className="button button-primary" href="/courses">
            Khám phá khóa học
            <Icon name="arrow" size={19} />
          </Link>
        </section>
        <aside className={styles.contents} aria-label="Không gian Mindy">
          <div className={styles.values}>
            <span>
              <Icon name="book" />
              Học tập có định hướng
            </span>
            <span>
              <Icon name="users" />
              Đồng hành cùng mentor
            </span>
            <span>
              <Icon name="shield" />
              Kết nối với trung tâm
            </span>
          </div>
          <HealthCheck />
          <Link className="button button-secondary" href="/compiler">
            Test compiler
          </Link>
        </aside>
      </main>
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Mindy Center · Cùng nhau tiến bộ mỗi ngày.
      </footer>
    </div>
  );
}
