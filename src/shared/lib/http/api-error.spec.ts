import { expect, it } from 'vitest';
import { ApiError, errorMessage } from './api-error';

it('uses Vietnamese messages for unmapped upstream errors without exposing English details', () => {
  expect(errorMessage(new ApiError(422, 'HTTP_ERROR', 'name must be a string'))).toBe(
    'Thông tin chưa hợp lệ hoặc chưa đủ điều kiện thực hiện.',
  );
  expect(errorMessage(new ApiError(503, 'UNKNOWN', 'Service Unavailable'))).toBe(
    'Yêu cầu chưa thực hiện được. Vui lòng thử lại sau.',
  );
  expect(errorMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials'))).toBe(
    'Email hoặc mật khẩu chưa đúng.',
  );
});
