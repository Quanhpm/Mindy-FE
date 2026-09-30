import Link from 'next/link';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <Link className="button button-secondary" href="/login">
          Đăng nhập
          <Icon name="arrow" size={17} />
        </Link>
      </header>
      <main id="main-content" className="landing-main">
        <p className="eyebrow">MINDY LEARNING CENTER</p>
        <h1>
          Một nơi để học.
          <br />
          <span>Một hành trình để lớn.</span>
        </h1>
        <p>
          Kết nối học viên, mentor và đội ngũ trung tâm trong một không gian chung. Bắt đầu hành
          trình của bạn cùng Mindy.
        </p>
        <Link className="button button-primary" href="/login">
          Vào không gian Mindy
          <Icon name="arrow" size={19} />
        </Link>
        <div className="landing-values">
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
      </main>
      <footer className="landing-footer">
        © {new Date().getFullYear()} Mindy Center · Cùng nhau tiến bộ mỗi ngày.
      </footer>
    </div>
  );
}
