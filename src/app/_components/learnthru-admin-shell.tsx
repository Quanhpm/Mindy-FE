'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { roleLabels, type User } from '@/shared/api/contracts/identity';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import { Avatar } from '@/shared/ui/user-display';
import styles from './learnthru-admin-shell.module.css';

export function LearnthruAdminShell({
  children,
  user,
  navigation,
  error,
  current,
}: {
  children: React.ReactNode;
  user: User;
  navigation: (onNavigate?: () => void) => React.ReactNode;
  error?: string;
  current: string;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    );
  }, []);
  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <Brand />
          </div>
          <nav aria-label="Điều hướng chính" className={styles.navigation}>
            {navigation()}
          </nav>
          <div className={styles.help}>
            <span>
              <Icon name="shield" size={30} />
            </span>
            <strong>Cùng nhau tiến bộ</strong>
            <p>Quản lý đội ngũ và học viên trong một không gian.</p>
            <Link href="/management/classes">
              Xem lớp & lịch học <Icon name="arrow" size={14} />
            </Link>
          </div>
          <small>© {new Date().getFullYear()} Mindy Center</small>
        </aside>
        <main id="main-content" className={styles.workspace}>
          <header className={styles.topbar}>
            <div>
              <button
                type="button"
                ref={trigger}
                className={styles.menuButton}
                aria-label="Mở menu"
                aria-haspopup="dialog"
                onClick={() => drawer.current?.showModal()}
              >
                <Icon name="menu" />
              </button>
              <span className={styles.workspaceLabel}>
                <Icon name="users" size={18} /> {current}
              </span>
            </div>
            <span className={styles.date}>{today}</span>
          </header>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {children}
        </main>
        <aside className={styles.rightPanel}>
          <section className={styles.profile}>
            <Avatar name={user.displayName} large />
            <h2>{user.displayName}</h2>
            <p>{roleLabels[user.role]}</p>
            <Link href="/account" className="button button-primary">
              Hồ sơ của tôi
            </Link>
          </section>
          <section className={styles.account}>
            <h2>Tài khoản quản trị</h2>
            <span className={styles.accountLabel}>Email</span>
            <p>{user.email}</p>
            <span className={styles.accountLabel}>Quyền truy cập</span>
            <span className={styles.permission}>
              <Icon name="shield" size={15} /> Quản trị trung tâm
            </span>
          </section>
          <section className={styles.guide}>
            <h2>Gợi ý quản lý trung tâm</h2>
            <div>
              <span>
                <Icon name="user" size={19} />
              </span>
              <p>
                <strong>Đội ngũ & học viên</strong>Quản lý vai trò, xác thực và trạng thái tài
                khoản.
              </p>
            </div>
            <div>
              <span>
                <Icon name="mail" size={19} />
              </span>
              <p>
                <strong>Khóa học & học phần</strong>Chuẩn bị đề cương trước khi mở khóa học.
              </p>
            </div>
            <div>
              <span>
                <Icon name="shield" size={19} />
              </span>
              <p>
                <strong>Lớp & lịch học</strong>Kiểm tra mentor, lịch và học phần trước khi mở lớp.
              </p>
            </div>
          </section>
        </aside>
      </div>
      <dialog
        ref={drawer}
        className={styles.drawer}
        aria-label="Menu Mindy"
        onClose={() => trigger.current?.focus()}
      >
        <div className={styles.drawerHeading}>
          <Brand />
          <button type="button" aria-label="Đóng menu" onClick={() => drawer.current?.close()}>
            <Icon name="close" />
          </button>
        </div>
        <nav className={styles.navigation} aria-label="Điều hướng mobile">
          {navigation(() => drawer.current?.close())}
        </nav>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </div>
  );
}
