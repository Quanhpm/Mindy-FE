'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { canManageUsers, useSession } from '@/features/auth/client';
import { roleLabels } from '@/shared/api/contracts/identity';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import { Avatar } from '@/shared/ui/user-display';
import { MindyAdminShell } from './mindy-admin-shell';

const managementLinks = [
  { href: '/management/users', label: 'Người dùng', icon: 'users' },
  { href: '/management/course-categories', label: 'Danh mục', icon: 'book' },
  { href: '/management/courses', label: 'Khóa học', icon: 'book' },
  { href: '/management/classes', label: 'Lớp & lịch học', icon: 'clock' },
  { href: '/management/payments/reconciliation', label: 'Đối soát', icon: 'clock' },
] as const;
const studentLinks = [
  { href: '/courses', label: 'Khóa học', icon: 'book' },
  { href: '/cart', label: 'Giỏ hàng', icon: 'cart' },
  { href: '/orders', label: 'Đơn đăng ký', icon: 'clock' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!user) return null;
  const links = canManageUsers(user.role)
    ? managementLinks
    : user.role === 'STUDENT'
      ? studentLinks
      : [{ href: '/courses', label: 'Khóa học', icon: 'book' } as const];
  const current =
    pathname === '/checkout'
      ? 'Tạo đơn giữ chỗ'
      : (links.find(({ href }) => pathname.startsWith(href))?.label ?? 'Tài khoản');
  async function exit(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await signOut();
      drawer.current?.close();
      router.replace('/login');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  const navigation = (onNavigate: () => void = () => drawer.current?.close()) => (
    <>
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname.startsWith(href) ? 'page' : undefined}
          onClick={onNavigate}
        >
          <Icon name={icon} size={18} />
          {label}
        </Link>
      ))}
      <Link
        href="/account"
        aria-current={pathname === '/account' ? 'page' : undefined}
        onClick={onNavigate}
      >
        <Icon name="user" size={18} />
        Tài khoản của tôi
      </Link>
      <button type="button" disabled={busy} onClick={() => void exit()}>
        <Icon name="logout" size={18} />
        {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
    </>
  );
  if (canManageUsers(user.role)) {
    return (
      <MindyAdminShell user={user} navigation={navigation} error={error} current={current}>
        {children}
      </MindyAdminShell>
    );
  }
  return (
    <div className="editorial-shell">
      <header className="editorial-header">
        <div className="editorial-brand">
          <button
            ref={trigger}
            type="button"
            className="icon-button editorial-menu"
            aria-label="Mở menu"
            aria-haspopup="dialog"
            onClick={() => drawer.current?.showModal()}
          >
            <Icon name="menu" />
          </button>
          <Brand />
        </div>
        <span className="editorial-workspace">Không gian học tập / {current}</span>
        <Link href="/account" className="topbar-user">
          <div>
            <strong>{user.displayName}</strong>
            <span>{roleLabels[user.role]}</span>
          </div>
          <Avatar name={user.displayName} />
        </Link>
      </header>
      <div className="editorial-navigation">
        <nav aria-label="Điều hướng chính">{navigation()}</nav>
      </div>
      {error && (
        <p className="inline-error editorial-shell-error" role="alert">
          {error}
        </p>
      )}
      <main id="main-content" className="content editorial-content">
        {children}
      </main>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Mindy Center</span>
        <span>Cùng nhau tiến bộ mỗi ngày.</span>
      </footer>
      <dialog
        ref={drawer}
        className="editorial-drawer"
        aria-label="Menu Mindy"
        onClose={() => trigger.current?.focus()}
      >
        <div className="editorial-drawer-heading">
          <Brand />
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng menu"
            onClick={() => drawer.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Điều hướng mobile">{navigation()}</nav>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </div>
  );
}
