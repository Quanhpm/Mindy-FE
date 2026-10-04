export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const messages: Record<string, string> = {
  INVALID_EMAIL_VERIFICATION_TOKEN:
    'Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu email mới.',
  MAIL_DELIVERY_UNAVAILABLE: 'Chưa thể gửi email xác thực. Vui lòng thử lại sau.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu chưa đúng.',
  AUTHENTICATION_REQUIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_REFRESH_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_REGISTRATION_INTENT: 'Thông tin đăng ký Google đã hết hạn. Vui lòng bắt đầu lại.',
  GOOGLE_AUTHENTICATION_FAILED: 'Chưa thể đăng nhập bằng Google. Vui lòng thử lại.',
  INSUFFICIENT_ROLE: 'Bạn chưa có quyền thực hiện thao tác này.',
  USER_EMAIL_ALREADY_EXISTS: 'Email này đã được sử dụng.',
  USER_PHONE_ALREADY_EXISTS: 'Số điện thoại này đã được sử dụng.',
  USER_NOT_FOUND: 'Không tìm thấy người dùng.',
  API_UNAVAILABLE: 'Chưa thể kết nối hệ thống. Vui lòng thử lại sau.',
  INVALID_RESPONSE: 'Dữ liệu trả về chưa đúng định dạng. Vui lòng thử lại.',
};

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Có lỗi xảy ra. Vui lòng thử lại.';
  return (
    messages[error.code] ??
    (error.status === 403 ? messages.INSUFFICIENT_ROLE : error.message) ??
    'Yêu cầu thất bại.'
  );
}
