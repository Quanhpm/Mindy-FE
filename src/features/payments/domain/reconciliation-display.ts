const statusLabels: Record<string, string> = {
  CREATING: 'Đang tạo thanh toán',
  PENDING: 'Chờ thanh toán',
  PROCESSING: 'Đang xử lý',
  PAID: 'Đã thanh toán',
  SUCCEEDED: 'Thanh toán thành công',
  SETTLED: 'Đã ghi nhận thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
  NOT_FOUND: 'Không tìm thấy thanh toán',
  REQUIRES_REVIEW: 'Cần đối soát',
  DUPLICATE: 'Giao dịch đã được ghi nhận trước đó',
  CONFIRM_SAMPLE: 'Đã nhận mẫu xác minh kết nối',
};
const reasonLabels: Record<string, string> = {
  INVALID_RESULT_OR_CURRENCY: 'Kết quả hoặc loại tiền không hợp lệ',
  AMOUNT_OR_METHOD_MISMATCH: 'Số tiền hoặc phương thức thanh toán không khớp',
  LINK_MISMATCH: 'Liên kết thanh toán không khớp',
  ORDER_CLOSED_OR_LATE: 'Đơn đã đóng hoặc thanh toán đến muộn',
  LATE_PAYMENT: 'Thanh toán đến muộn',
  CLASS_CANCELLED: 'Lớp học đã bị hủy',
  PAYMENT_ALREADY_REQUIRES_REVIEW: 'Thanh toán đang cần đối soát',
  ADDITIONAL_SETTLEMENT: 'Phát sinh giao dịch sau khi đã thanh toán',
  MISSING_OR_RELEASED_HOLD: 'Chỗ giữ không tồn tại hoặc đã được giải phóng',
  UNKNOWN_PROVIDER_ORDER: 'Không xác định được đơn thanh toán từ nhà cung cấp',
  REFERENCE_COLLISION: 'Mã tham chiếu trùng với giao dịch khác',
};
const sourceLabels: Record<string, string> = {
  WEBHOOK: 'Thông báo tự động từ PayOS',
  RECONCILIATION: 'Đối soát với PayOS',
};
export function reconciliationStatusLabel(status: string): string {
  return statusLabels[status] ?? 'Trạng thái chưa được hỗ trợ';
}
export function reconciliationReasonLabel(reason: string | null): string {
  return reason === null ? 'Chưa có lý do' : (reasonLabels[reason] ?? 'Lý do chưa được hỗ trợ');
}
export function reconciliationSourceLabel(source: string): string {
  return sourceLabels[source] ?? 'Nguồn chưa được hỗ trợ';
}
