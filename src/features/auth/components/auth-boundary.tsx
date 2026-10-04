'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { canManageUsers } from '../permissions/access-policy';
import { useSession } from '../session/session-provider';

export function AuthBoundary({
  children,
  management = false,
}: {
  children: React.ReactNode;
  management?: boolean;
}) {
  const { user, state, error, anonymousReason, reload } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (state === 'anonymous') {
      const returnTo = `${pathname}${window.location.search}${window.location.hash}`;
      router.replace(
        anonymousReason === 'logout' ? '/login' : `/login?next=${encodeURIComponent(returnTo)}`,
      );
    }
  }, [state, anonymousReason, pathname, router]);
  if (state === 'error')
    return (
      <ErrorPanel message={error ?? 'Không thể tải phiên đăng nhập.'} retry={() => void reload()} />
    );
  if (state !== 'authenticated' || !user)
    return <LoadingState label="Đang kiểm tra phiên đăng nhập…" />;
  if (management && !canManageUsers(user.role))
    return (
      <section className="empty-state">
        <h1>Bạn chưa có quyền truy cập</h1>
        <p>Khu vực này dành cho quản trị viên.</p>
        <Link className="button button-primary" href="/account">
          Về tài khoản
        </Link>
      </section>
    );
  return children;
}
