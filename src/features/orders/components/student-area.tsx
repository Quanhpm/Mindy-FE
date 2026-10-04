'use client';

import Link from 'next/link';
import { canPurchaseClasses, useSession } from '@/features/auth/client';
import { LoadingState } from '@/shared/components/feedback';

export function StudentArea({ children }: { children: (userId: string) => React.ReactNode }) {
  const { user, state } = useSession();
  if (state !== 'authenticated' || !user)
    return <LoadingState label="Đang kiểm tra phiên đăng nhập…" />;
  if (!canPurchaseClasses(user.role))
    return (
      <section className="empty-state">
        <h1>Khu vực dành cho học viên</h1>
        <p>Chỉ tài khoản học viên có thể tạo và xem đơn đăng ký của mình.</p>
        <Link className="button button-primary" href="/account">
          Về tài khoản
        </Link>
      </section>
    );
  return children(user.id);
}
