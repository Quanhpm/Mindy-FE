import Link from 'next/link';
import { formatDate } from '@/shared/lib/date';
import { formatAmount } from '../domain/order-display';
import { type Order, orderStatusLabels, paymentLabels } from '../schemas/order.schema';
import styles from './orders.module.css';

export function OrderSummary({ order, link = true }: { order: Order; link?: boolean }) {
  return (
    <article className={styles.order} aria-label={`Đơn ${order.orderCode}`}>
      <div className={styles.orderHeading}>
        <div>
          <p className={styles.eyebrow}>ĐƠN ĐĂNG KÝ</p>
          <h2>
            {link ? <Link href={`/orders/${order.id}`}>{order.orderCode}</Link> : order.orderCode}
          </h2>
        </div>
        <span className={styles.badge} data-status={order.status}>
          {orderStatusLabels[order.status]}
        </span>
      </div>
      <dl className={styles.meta}>
        <div>
          <dt>Phương thức</dt>
          <dd>{paymentLabels[order.paymentType]}</dd>
        </div>
        <div>
          <dt>Tổng tiền</dt>
          <dd className={styles.amount}>{formatAmount(order.totalAmount)}</dd>
        </div>
        <div>
          <dt>Ngày tạo</dt>
          <dd>{formatDate(order.createdAt, true)}</dd>
        </div>
        <div>
          <dt>Hạn giữ chỗ</dt>
          <dd>{formatDate(order.expiresAt, true)}</dd>
        </div>
      </dl>
      <ul className={styles.snapshots} aria-label="Các lớp trong đơn">
        {order.details.map((detail) => (
          <li key={detail.id}>
            <div>
              <strong>{detail.courseTitle}</strong>
              <p>{detail.className}</p>
              <span className="muted small">
                {detail.quantity} suất học · {formatAmount(detail.priceAmount)}
              </span>
            </div>
            <span className={styles.amount}>{formatAmount(detail.totalAmount)}</span>
          </li>
        ))}
      </ul>
      {order.mentorId && (
        <p className={styles.mentorId}>
          Mã mentor thu tiền mặt: <span>{order.mentorId}</span>
        </p>
      )}
      {order.paidAt && (
        <p className="muted small">
          Ngày thanh toán theo hệ thống: {formatDate(order.paidAt, true)}
        </p>
      )}
      {link && (
        <Link className={styles.textLink} href={`/orders/${order.id}`}>
          Xem chi tiết đơn →
        </Link>
      )}
    </article>
  );
}
