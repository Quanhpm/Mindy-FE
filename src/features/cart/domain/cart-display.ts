import { ApiError, errorMessage } from '@/shared/lib/http/api-error';

const messages: Record<string, string> = {
  CART_ITEM_ALREADY_EXISTS: 'Lớp này đã có trong giỏ hàng.',
  CART_ITEM_NOT_FOUND: 'Lớp này không còn trong giỏ hàng.',
  CART_LIMIT_EXCEEDED: 'Giỏ hàng có tối đa 20 lớp. Hãy bỏ một lớp trước khi thêm.',
  CART_EMPTY: 'Giỏ hàng đang trống.',
  CLASS_NOT_FOUND: 'Lớp học không còn khả dụng.',
  CLASS_NOT_OPEN: 'Lớp này hiện không mở đăng ký.',
  CLASS_FULL: 'Lớp đã hết chỗ. Hãy chọn lớp khác.',
  CLASS_ALREADY_ENROLLED: 'Bạn đã giữ chỗ hoặc đã đăng ký lớp này.',
};
export function cartErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? (messages[error.code] ?? errorMessage(error))
    : errorMessage(error);
}
export function unknownMutationResult(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500;
}
export function formatCartAmount(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}
export function formatCartDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
