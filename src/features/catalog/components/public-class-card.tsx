'use client';

import Link from 'next/link';
import { AddToCartButton } from '@/features/cart/client';
import s from '@/shared/components/management.module.css';
import { formatCourseDate, type PublicClass } from '../schemas/public-catalog.schema';
import styles from './public-catalog.module.css';

export function PublicClassCard({
  item,
  priceAmount,
  returnTo,
}: {
  item: PublicClass;
  priceAmount: number;
  returnTo: string;
}) {
  return (
    <article className={styles.classCard}>
      <p className={styles.eyebrow}>
        {item.deliveryMode === 'ONLINE' ? 'TRỰC TUYẾN' : 'TẠI TRUNG TÂM'} / {item.code}
      </p>
      <h3>
        <Link href={`/classes/${item.id}`}>{item.name}</Link>
      </h3>
      <div className={styles.metadata}>
        <p>Mentor: {item.mentor.displayName ?? 'Chưa có tên hiển thị'}</p>
        <p>
          {formatCourseDate(item.startDate)} – {formatCourseDate(item.endDate)}
        </p>
        <p>
          {item.availableSeats > 0
            ? `Còn ${item.availableSeats} chỗ / ${item.maxStudents}`
            : 'Lớp đã hết chỗ'}
        </p>
        <p>Học phí: {priceAmount.toLocaleString('vi-VN')} ₫</p>
      </div>
      <div className={styles.classActions}>
        <Link className={s.secondaryButton} href={`/classes/${item.id}`}>
          Xem lịch học
        </Link>
        <AddToCartButton
          classId={item.id}
          returnTo={returnTo}
          disabled={item.availableSeats === 0}
          unavailableReason="Lớp đã hết chỗ."
        />
      </div>
    </article>
  );
}
