'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useSession } from '@/features/auth/client';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Icon } from '@/shared/ui/icon';
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
const managerLinks = [
  { href: '/manager/classes', label: 'Lớp học', icon: 'book' },
  { href: '/manager/materials', label: 'Tài liệu môn học', icon: 'book' },
] as const;
const mentorLinks = [
  { href: '/mentor/classes', label: 'Lớp giảng dạy', icon: 'book' },
  { href: '/mentor/cash-orders', label: 'Thu tiền mặt', icon: 'cart' },
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<string>();
  if (!user) return null;
  const links =
    user.role === 'ADMIN'
      ? managementLinks
      : user.role === 'MANAGER'
        ? managerLinks
        : user.role === 'STUDENT'
          ? studentLinks
          : mentorLinks;
  const current =
    pathname === '/checkout'
      ? 'Tạo đơn giữ chỗ'
      : pathname.startsWith('/learning/')
        ? 'Lớp học'
        : pathname === '/payment/result'
          ? 'Kết quả thanh toán'
          : (links.find(({ href }) => pathname.startsWith(href))?.label ?? 'Tài khoản');
  async function exit() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await signOut();
      router.replace('/login');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const navigation = (onNavigate?: () => void) => (
    <>
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname.startsWith(href) ? 'page' : undefined}
          onClick={onNavigate}
        >
          <Icon name={icon} size={20} />
          {label}
        </Link>
      ))}
    </>
  );
  return (
    <MindyAdminShell
      user={user}
      navigation={navigation}
      error={error}
      current={current}
      signingOut={busy}
      onSignOut={() => void exit()}
    >
      {children}
    </MindyAdminShell>
  );
}
