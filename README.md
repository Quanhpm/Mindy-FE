# Mindy FE

Frontend Next.js cho Mindy Center, đặt cạnh repository `Mindy-BE`.
Tích hợp theo backend `feat(api)/booking-sprint`, commit `577af2f`.

## Chạy local

Yêu cầu Node.js **22.20.0** và pnpm **12.6.0**. Dùng `corepack enable` và
`corepack prepare pnpm@12.6.0 --activate` nếu máy có Corepack.

```sh
cd /path/to/mindy-fe
cp .env.example .env.local
pnpm install
pnpm hooks:install
pnpm dev
```

Mở **http://localhost:3002**. File `.env.local` mẫu đã được tạo trong lần scaffold này.
Ở máy mới, thực hiện lệnh copy như trên. Không commit `.env.local`.

Backend phải chạy riêng. Chuẩn bị PostgreSQL, migration và seed admin theo README
trong `../Mindy-BE`, sau đó chạy `pnpm dev` tại thư mục backend. Dùng tài khoản thật
đã seed; frontend không có tài khoản hoặc dữ liệu demo mặc định.

```dotenv
API_BASE_URL=http://localhost:3000/api/v1
APP_ORIGIN=http://localhost:3002
```

- Nếu backend dùng cổng khác, sửa `API_BASE_URL` rồi khởi động lại frontend.
- `APP_ORIGIN` phải trùng origin trên thanh địa chỉ, không có dấu `/` cuối.
- Giữ hostname thống nhất (`localhost`), backend local dùng `COOKIE_SECURE=false`.
- Khi deploy, dùng HTTPS, `COOKIE_SECURE=true` ở backend và origin production chính xác.
- Các biến trên chỉ dùng ở server. Không cần JWT key, database URL hoặc Clerk key ở FE.
- Chỉ proxy `/api/v1/*` phục vụ endpoint đã allowlist. `/docs` thuộc backend.

## Phần đã triển khai

- Landing và login, giao diện tiếng Việt, responsive.
- Cookie auth: `/me`, refresh có single-flight và Web Locks giữa các tab, logout/logout-all.
- Tài khoản cá nhân chỉ đọc theo API hiện tại.
- ADMIN: users, categories/courses/units và classes/schedule/lifecycle.
- Google sign-in/onboarding với dedicated navigation adapter.
- Public courses/class detail và syllabus unit viewer có hai vùng scroll riêng.
- STUDENT: giỏ lớp học thật, checkout tạo đơn giữ chỗ và own orders.
  Checkout chưa hoàn tất thanh toán; PayOS/cash confirmation và ACTIVE learning chờ BE.
- Loading/error/empty states, form validation theo DTO, confirmation cho đổi trạng thái.
- API adapter cùng origin: allowlist route/method, kiểm tra Origin cho mutation,
  giới hạn body, timeout, cookie policy theo endpoint và không cache response cá nhân.
- Unit tests và E2E dùng API mô phỏng; CI, pre-commit và kiểm tra ranh giới module.

## Lệnh chất lượng

```sh
pnpm lint           # Biome + module boundaries
pnpm type-check     # Next route types + TypeScript
pnpm test           # Unit tests
pnpm build          # Production build
pnpm check          # Toàn bộ bốn bước trên
pnpm exec playwright install chromium
pnpm test:e2e       # Chạy sau build; dùng cổng 3101, không dùng DB thật
```

E2E kiểm tra frontend với API mô phỏng và ranh giới API proxy; không chứng minh
backend/database/refresh transaction đã vận hành đúng. Cần chạy smoke test với
backend thật trước khi nghiệm thu tích hợp. Xem `docs/progress.md` để biết kết quả lần gần nhất.

## Tài liệu

- [UI rules — Ocean Editorial](./docs/ui-rules.md): bắt buộc đọc trước khi tạo/sửa
  giao diện; màu, typography, component, responsive và quy trình kiểm tra.
- [Implementation phases](./docs/implement_phase/README.md): kế hoạch frontend
  Phase 0–2 ngang phạm vi backend, task, API dependency, test và exit criteria.
- `docs/architecture.md`: cấu trúc, ranh giới, state và auth.
- `docs/api-contracts.md`: API thực tế, DTO, lỗi, các điểm cần phối hợp backend.
- `docs/progress.md`: tiến độ và roadmap theo phase.

Tham khảo tooling từ ixartz/Next-js-Boilerplate. Dự án này dùng NestJS cho auth và
dữ liệu; nền tảng frontend được dựng riêng để khớp backend Mindy.
