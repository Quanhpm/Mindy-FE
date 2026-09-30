# API contract — NestJS dev / b500dbf

Nguồn: auth.controller.ts, users.controller.ts, DTO runtime, guards và exception filter
của repository `../Mindy-BE`. Docs kế hoạch mô tả tính năng tương lai, không phải API đã có.

## Identity đã có

| Method | Path sau `/api/v1` | Response |
| --- | --- | --- |
| POST | /auth/login | 200 `{ user, accessTokenExpiresAt }` + cookies |
| POST | /auth/refresh | 200 cùng shape login + rotated cookies |
| GET | /auth/me | 200 `User` |
| POST | /auth/logout | 204, clear cookies |
| POST | /auth/logout-all | 204, clear cookies |
| GET | /admin/users | 200 `{ items, page, pageSize, total }` |
| POST | /admin/users | 201 `User` |
| GET | /admin/users/:userId | 200 `User` |
| PATCH | /admin/users/:userId/status | 200 `User` |

Users endpoints dành cho ADMIN và MANAGER. Mentor và Student chỉ có trang account hiện tại.
Không có public registration, reset password, profile edit, role edit hoặc upload avatar.

## Payload

- Login: email hợp lệ tối đa 320; password 1–128; deviceName tùy chọn tối đa 150.
- Create user: email; displayName 1–150; password 7–32 theo validator runtime hiện tại;
  Swagger decorators lại mô tả 12–128; phone tùy chọn 7–32; role.
- Role: ADMIN, MANAGER, MENTOR, STUDENT.
- Status: ACTIVE, SUSPENDED.
- List: page mặc định 1; pageSize mặc định 20, tối đa 100; role/status tùy chọn.
- Hiện chưa hỗ trợ search keyword hoặc tùy chỉnh sort. Backend sắp createdAt DESC.
- ValidationPipe từ chối field lạ với 422. Không gửi cả object response ngược làm payload.

User gồm id, email, phone nullable, displayName, role, status, lastLoginAt nullable,
createdAt. Ngày giờ ở HTTP là string ISO; không dùng trực tiếp kiểu Date của class NestJS.

## Lỗi

```ts
type ApiErrorBody = {
  statusCode: number;
  code: string;
  message: string | string[];
  details?: unknown;
  requestId?: string;
};
```

Validation hiện trả HTTP_ERROR, không mặc định VALIDATION_FAILED theo ví dụ trong docs.
Giữ 401/403/404/409/422 riêng biệt; không đưa raw token hoặc request body chứa mật khẩu vào log.

## Điểm cần phối hợp backend

- Swagger CreateUserDto gắn lệch metadata phone/password/displayName. Chưa sinh types tự động.
- AuthService.refresh cập nhật revoke rồi throw trong cùng transaction; cần sửa rollback
  trước khi coi reuse detection là hoàn chỉnh.
- Phase 0/1 chưa đóng toàn bộ exit criteria theo docs/Progress.md của BE.
- Cookie Origin/CSRF baseline ở FE adapter không thay thế bảo vệ nếu API backend còn được
  browser truy cập trực tiếp. Hạ tầng production cần chốt đường truy cập và cấu hình proxy tin cậy.

## Core flow tương lai

Catalog sở hữu categories, courses, course units và materials. Classes sở hữu lớp,
class units, sessions, enrollment, progress và attendance. Commerce sở hữu cart/order;
payments xử lý giao dịch. Backend quyết định giá, số chỗ, trạng thái và quyền học.

Frontend chỉ xác nhận thanh toán sau khi đọc trạng thái backend; không tin query redirect.
Link PayOS lỗi thì retry trên cùng order, không checkout tạo order mới. Học liệu chỉ dùng
file READY. Flow tiền mặt/mentor xác nhận trong document/Flow.txt còn khác core docs:
cần chốt trước khi triển khai luồng đó.
