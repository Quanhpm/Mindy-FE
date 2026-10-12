'use client';
import Link from 'next/link';
import { useSession } from '@/features/auth/client';
import { LoadingState } from '@/shared/components/feedback';
import s from '@/shared/components/management.module.css';
export function ManagerMaterialsPage() {
  const { user, state } = useSession();
  if (state !== 'authenticated' || !user) return <LoadingState />;
  if (user.role !== 'MANAGER')
    return (
      <section className="empty-state">
        <h1>Khu vực dành cho quản lý</h1>
        <Link href="/account">Về tài khoản</Link>
      </section>
    );
  return (
    <section className={s.page}>
      <header className={s.heading}>
        <div>
          <p className={s.eyebrow}>QUẢN LÝ</p>
          <h1>Tài liệu môn học</h1>
          <p>Quản lý tài liệu theo môn học và chương.</p>
        </div>
      </header>
      <div className={s.panel}>
        <h2>Chức năng đang được chuẩn bị</h2>
        <p>Trang chọn môn học và tải tài liệu cho từng chương sẽ được bổ sung sau.</p>
        <Link className={s.secondaryButton} href="/manager/classes">
          Về danh sách lớp học
        </Link>
      </div>
    </section>
  );
}
