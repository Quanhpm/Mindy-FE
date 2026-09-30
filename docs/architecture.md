# Frontend architecture

## Phạm vi

Mindy FE là Next.js App Router, React, TypeScript strict và pnpm. NestJS sở hữu
database, JWT/session, quyền truy cập và transaction nghiệp vụ. FE dùng React Hook
Form + Zod cho input, Biome cho style/lint, Vitest và Playwright cho kiểm thử.
CSS dùng design tokens và các component chung; chưa thêm UI framework khi chưa cần.

## Cấu trúc

```text
src/
  app/                  routes, layout, composition, API adapter
    _components/        shell ghép auth + navigation
    _providers/         composition của context providers
    (public)/           landing
    (auth)/             login
    (protected)/        account, management/users
    api/v1/[...path]/    allowlisted NestJS adapter
  features/
    auth/               session, login, role presentation, recovery
    users/              list, create, detail, status
  shared/
    api/contracts/      schema API dùng chung giữa auth và users
    components/         feedback states
    config/             typed server env
    lib/                HTTP và date formatting
    ui/                 icon, brand, avatar, role/status display
tests/e2e/              user journeys với API mô phỏng
scripts/                module boundary check
```

`app -> features -> shared`. `users` được dùng public API `auth/client` để gửi request
đã xác thực; `auth` không import `users`. Contract identity dùng chung có hai consumer
nên được đặt trong shared. Script `check-boundaries.mjs` kiểm tra các import này khi lint.
Component của một feature dùng ở nhiều route vẫn ở trong feature.

Feature xuất `client.ts`; chỉ thêm `server.ts` khi có consumer server thật. Code server
chứa secrets phải đánh dấu `server-only`. Không export chung server và client từ một barrel.

## Rendering và session

- Landing render ở server; form và dashboard tương tác ở client.
- Các trang được bảo vệ chỉ lấy dữ liệu cá nhân sau khi bootstrap session hoàn tất.
- Backend kiểm tra authentication, role và ownership trên mỗi endpoint. AuthBoundary
  chỉ điều khiển UX, không phải ranh giới bảo mật duy nhất.
- Không cache response cá nhân. Không lưu user/token vào localStorage.
- Browser giữ cookie HttpOnly do NestJS phát hành qua adapter cùng origin.
- Access cookie `Path=/`; refresh cookie `Path=/api/v1/auth/refresh`.
- Bootstrap gọi `/auth/me`; nếu 401 thì khôi phục phiên rồi đọc tiếp.
- Một tab dùng shared Promise; các tab dùng Web Locks. Sau khi lấy lock, đọc `/me`
  lần nữa để tránh rotate token đã được tab khác đổi. Browser không hỗ trợ Web Locks
  chỉ có bảo vệ trong một tab; deployment cần browser hiện đại trên HTTPS/localhost.
- Không retry login sai mật khẩu, lỗi 403 hoặc mutation thất bại do mạng.
- Chỉ replay một lần khi backend trả `AUTHENTICATION_REQUIRED` từ guard trước mutation.
- Logout và login thông báo các tab qua BroadcastChannel.

Chưa thêm fetch dữ liệu cá nhân trong Server Components. Nếu thêm, phải forward access
cookie tới backend tin cậy, dùng no-store và thiết kế đường phục hồi ở browser; request
trang thông thường không nhận refresh cookie có path hẹp.

## HTTP adapter

API_BASE_URL trỏ cố định tới NestJS; path và method phải nằm trong allowlist.
Mutation phải có Origin khớp APP_ORIGIN. Không proxy URL tùy ý, authorization headers,
cookie ngoài auth, hoặc redirect từ upstream. Giữ Set-Cookie riêng biệt, body tối đa
32 KiB và timeout upstream 10 giây. Không ghi log token, password hoặc cookie.

Server env được kiểm tra ở request boundary, không đóng cứng API URL vào client bundle.
Thiếu/sai env trả lỗi cấu hình chung, không lộ chi tiết. Khi thêm endpoint mới, bổ sung
allowlist và kiểm thử contract tương ứng. Endpoint upload tương lai cần policy riêng;
không tăng giới hạn payload identity để chuyển file qua đây.

## State và API types

- Session: auth context; form: React Hook Form; filter/page: URL.
- Dữ liệu users: request theo route/filter, hủy request cũ khi chuyển trang.
- User role/status/response schema theo backend dev/b500dbf.
- Form payload tách response; phone rỗng được bỏ khỏi create payload.
- Datetime JSON là string; hiển thị múi giờ Asia/Ho_Chi_Minh.
- Chưa sinh OpenAPI vì Swagger CreateUserDto ở backend đang lệch decorators.
  Sau khi backend sửa, thêm `shared/api/generated` và workflow kiểm tra contract drift.

## Quy ước

File kebab-case; component PascalCase; type public rõ ràng; dùng import type khi phù hợp.
Chỉ tạo shared abstraction khi có consumer thật. Test có `.spec.ts`, đặt cạnh source.
Commit theo Conventional Commits. Chạy `pnpm hooks:install` sau khi clone để bật pre-commit;
CI vẫn là quality gate độc lập. Mỗi thay đổi cập nhật progress và tài liệu liên quan.
