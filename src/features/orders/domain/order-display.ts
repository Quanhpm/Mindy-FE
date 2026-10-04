import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import type { Order } from '../schemas/order.schema';

export function formatAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function remainingHold(
  order: Pick<Order, 'status' | 'expiresAt'>,
  now: number,
): number | null {
  return order.status === 'PENDING'
    ? Math.max(0, Math.ceil((Date.parse(order.expiresAt) - now) / 1000))
    : null;
}

export function formatRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const value = [hours, minutes, seconds % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  return days ? `${days} ngày ${value}` : value;
}

export function orderErrorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    const conflicts: Record<string, string> = {
      CLASS_FULL: 'Lớp đã hết chỗ. Vui lòng kiểm tra giỏ hàng và chọn lớp khác.',
      CLASS_NOT_OPEN: 'Lớp hiện không mở đăng ký. Vui lòng kiểm tra giỏ hàng.',
      CLASS_ALREADY_ENROLLED:
        'Bạn đã giữ chỗ hoặc đã đăng ký lớp này. Hãy kiểm tra các đơn của bạn.',
      CLASS_COURSE_INACTIVE: 'Khóa học hiện không còn mở đăng ký.',
      CLASS_NOT_FOUND: 'Lớp học không còn khả dụng.',
    };
    if (conflicts[cause.code]) return conflicts[cause.code] ?? '';
    if (cause.code === 'ORDER_ACCESS_DENIED') return 'Bạn không có quyền xem đơn đăng ký này.';
    if (cause.code === 'ORDER_NOT_FOUND') return 'Không tìm thấy đơn đăng ký.';
    if (cause.code === 'CART_EMPTY') return 'Giỏ hàng đã trống. Hãy kiểm tra các đơn của bạn.';
  }
  return errorMessage(cause);
}

export function isUnknownCheckoutResult(cause: unknown): boolean {
  return !(cause instanceof ApiError) || cause.status >= 500 || cause.code === 'INVALID_RESPONSE';
}
