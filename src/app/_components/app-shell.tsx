'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { canManageUsers, useSession } from '@/features/auth/client';
import { roleLabels } from '@/shared/api/contracts/identity';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';
import { Avatar } from '@/shared/ui/user-display';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!user) return null;
  const isUsers = pathname.startsWith('/management/users');
  async function exit(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await signOut();
      router.replace('/login');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      {open && (
        <button
          type="button"
          className="nav-overlay"
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
        />
      )}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`} id="main-sidebar">
        <div className="sidebar-brand">
          <Brand inverse />
          <button
            type="button"
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Mindy Center</strong>
            <span>Không gian làm việc</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <p className="nav-label">KHÔNG GIAN CỦA BẠN</p>
        <nav aria-label="Điều hướng chính">
          {canManageUsers(user.role) && (
            <Link
              className={`nav-link${isUsers ? ' nav-active' : ''}`}
              href="/management/users"
              aria-current={isUsers ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon name="users" />
              <span>Người dùng</span>
              <Icon name="chevron" size={15} />
            </Link>
          )}
          <Link
            className={`nav-link${pathname === '/account' ? ' nav-active' : ''}`}
            href="/account"
            aria-current={pathname === '/account' ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <Icon name="user" />
            <span>Tài khoản của tôi</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Icon name="book" size={25} />
            <p>
              Học hỏi hôm nay.
              <br />
              <strong>Tiến xa ngày mai.</strong>
            </p>
            <span>CÙNG MINDY</span>
          </div>
          {error && (
            <p className="sidebar-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="nav-link logout-link"
            type="button"
            onClick={() => void exit()}
            disabled={busy}
          >
            <Icon name="logout" />
            <span>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              type="button"
              className="icon-button mobile-only"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="main-sidebar"
              aria-label="Mở menu"
            >
              <Icon name="menu" />
            </button>
            <span>Mindy Center</span>
            <Icon name="chevron" size={14} />
            <strong>{isUsers ? 'Quản lý người dùng' : 'Tài khoản'}</strong>
          </div>
          <Link href="/account" className="topbar-user">
            <div>
              <strong>{user.displayName}</strong>
              <span>{roleLabels[user.role]}</span>
            </div>
            <Avatar name={user.displayName} />
          </Link>
        </header>
        <main id="main-content" className="content">
          {children}
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Mindy Center</span>
          <span>Cùng nhau tiến bộ mỗi ngày.</span>
        </footer>
      </div>
    </div>
  );
}
