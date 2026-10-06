import Image from 'next/image';
import Link from 'next/link';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import s from './auth-page.module.css';

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
    <main id="main-content" className={s.page}>
      <header className={s.header}>
        <Brand />
        <Link className={s.back} href="/">
          <Icon name="arrow" size={16} /> Về trang chủ
        </Link>
      </header>
      <div className={s.entry}>
        <aside className={s.story}>
          <p className={s.kicker}>CHÀO BẠN, MÌNH LÀ MINDY.</p>
          <h2>
            Điều mới bắt đầu
            <br />
            từ một chút tò mò.
          </h2>
          <p>
            Mỗi dòng code là một bước nhỏ.
            <br />
            Cùng khám phá điều bạn có thể tạo ra.
          </p>
          <Image
            src="/mindy/coding-mascot.png"
            alt="Bạn ếch Mindy học lập trình"
            width={1280}
            height={1280}
            sizes="(max-width: 800px) 80vw, 45vw"
            className={s.mascot}
          />
          <span className={s.note}>
            <Icon name="book" size={18} /> Học. Thử. Tiến bộ.
          </span>
        </aside>
        <section className={s.form}>
          <span className={s.formIcon}>
            <Icon name="user" size={24} />
          </span>
          <h1>{title}</h1>
          <p className={s.subtitle}>{subtitle}</p>
          {children}
          <p className={s.footnote}>Hành trình của bạn, cùng Mindy.</p>
        </section>
      </div>
      <footer className={s.footer}>
        <span>© {new Date().getFullYear()} Mindy Coding</span>
        <span>Cứ thử. Bạn sẽ làm được.</span>
      </footer>
    </main>
  );
}
