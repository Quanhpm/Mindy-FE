# Full integration audit — 2026-10-04

Đọc lại [8 prompts](./PROMPTS_BACKEND_INTEGRATION.md), [UI rules](../ui-rules.md),
source FE và BE `feat(api)/booking-sprint` tại `577af2f`. Kiểm kê chức năng hiện tại
nằm đầu [progress](../progress.md); các báo cáo ngày 2026-10-02 giữ bằng chứng lịch sử.

## Kết quả

| Kiểm tra | Kết quả |
| --- | --- |
| FE `pnpm check` | Biome/boundaries, TypeScript, 121 unit tests / 22 files, production build: pass |
| FE full Chromium E2E | 49 scenarios pass; API mô phỏng |
| BE `pnpm check` | Lint, TypeScript, 29 unit + 35 PostgreSQL integration tests, build: pass |
| Local live smoke | 12 bước pass; FE → BFF → NestJS → PostgreSQL, không mock request |
| Responsive/keyboard | 1440/768/390/375px; không tràn ngang, independent unit scroll, drawer/Escape/focus return |

Runtime: Node 22.20.0, pnpm 12.6.0. PostgreSQL 16 chạy trong container riêng,
database mới `mindy_audit_test`, dữ liệu trên tmpfs. Suite drop/migrate chỉ chạy
trên database test này. BE dùng khóa JWT test sinh trong memory, SMTP receiver
localhost và tài khoản/fixtures test. Không đọc hoặc sửa database ứng dụng.
Backend chỉ sửa formatting `src/modules/auth/dtos/register.dto.ts`; không đổi
nghiệp vụ, migration hoặc dependency versions. Không commit/push/merge/deploy.
Sau kiểm thử đã dừng FE/BE/SMTP test và xóa container/database tạm. Các dịch vụ
hoặc checkout có sẵn của người dùng được giữ nguyên.

## Các lỗi đã sửa và xác minh

- Authenticated mutations và logout giữ cùng session WebLock qua đọc `/auth/me`,
  kiểm tra principal và request. Chặn POST đầu tiên hoặc replay khi cookies thuộc
  account khác; generation cũ không được xóa session mới. Recovery trong lock
  không lấy lock lồng nhau; same-user recovery vẫn thực hiện mutation đúng một lần.
- Google GET callback chỉ validate/303 sang trang FE. Trang FE xóa code/state khỏi
  URL, exchange một lần qua POST adapter dưới session lock; cookie issuance không
  bị refresh từ tab khác ghi đè. Origin, JSON, redirect và cookie scopes được kiểm tra.
- Intent Google hợp lệ được ưu tiên trước session cũ ở onboarding. Lỗi Google hợp
  lệ vẫn hiển thị ở login khi còn session; đăng nhập thủ công thành công vẫn chuyển trang.
- Form tạo lớp giữ draft và lựa chọn qua picker loading/empty/error, 409 và mentor
  422. Controlled selects giữ DOM value đúng với RHF khi options thay đổi; luôn có
  tải lại để chọn mentor thay thế mà không mất các trường khác.
- Cart không hiển thị giá/CTA checkout cũ nếu refresh thất bại; retry đọc lại dữ liệu.
- Checkout retry E2E chờ giao diện receipt thật trước khi đếm orders, tránh nhầm
  hai articles của giỏ với hai receipts.

## Phạm vi live

Script [live-integration-smoke.mjs](../../scripts/live-integration-smoke.mjs)
chạy với production build FE ở `http://127.0.0.1:3103`, BE riêng ở cổng 3198.

1. Health BFF, admin đăng nhập bằng UI.
2. Tạo hai mentor và student dùng cho ownership bằng admin API.
3. Tạo category/course/units, reorder/activate qua API; đọc workspace admin bằng UI.
4. Tạo bốn classes, schedule bằng class-unit UUID, open qua API; đọc class admin bằng UI.
5. Đăng ký public, Nodemailer gửi email đến SMTP receiver nội bộ, nhấn xác thực trên UI.
6. Public filters, course/class/unit, không lộ meeting URL; unit scroll và mobile drawer.
7. Login return giữ class/unit; mất access cookie vẫn refresh đúng cùng identity; add/remove cart.
8. CASH UI checkout trả đủ hai orders tách mentor và snapshots từ server.
9. PAYOS UI checkout trả một pending order gồm hai lớp.
10. Own order list/filter/pagination/detail; student khác bị BE từ chối 403, student không đọc admin users.
11. PAYOS deadline thật: job BE chuyển EXPIRED, nhả chỗ, UI nhận status từ BE và thêm lại vào cart được.
12. Logout, private cart/order không còn hiển thị và yêu cầu login.

TTL test CASH 600s, PAYOS 60s, expiry worker 5s; không sửa TTL mặc định sản phẩm.
Admin form CRUD được kiểm bằng mocked E2E, live admin CRUD dùng API và UI read.
SMTP nội bộ xác minh đường gửi/nhận và verify token, chưa chứng minh delivery qua
nhà cung cấp email ngoài. Không lưu browser state/cookies/token trong artifacts.

[Machine-readable summary](./screenshots/live-local-smoke-summary.json) ghi steps,
thời gian, UUID fixtures và 27 ảnh `live-local-*`. Ví dụ:
[unit desktop](./screenshots/live-local-public-unit-1440.png),
[drawer mobile](./screenshots/live-local-public-unit-drawer-390.png),
[cart mobile](./screenshots/live-local-cart-390.png),
[expired order mobile](./screenshots/live-local-expired-order-390.png).

Để chạy lại, chuẩn bị BE/test DB riêng, admin fixture và SMTP receiver, build/start
FE trên local origin rồi chạy Node 22 với `LIVE_SMOKE_ISOLATED_TEST=1`,
`LIVE_MAILPIT_URL=<localhost receiver origin>` và `LIVE_SMOKE_VERIFY_EXPIRY=1`.
SMTP receiver cần Mailpit-compatible GET `/api/v1/messages` và
`/api/v1/message/:id`. Script chỉ chấp nhận localhost và không reset database.

## Chưa xác minh và backlog

Google OAuth với provider thật; email delivery bên ngoài; staging/production;
live fault injection/unknown checkout response; compiler runner live. Các lỗi
network/unknown-result/account-switch được kiểm bằng mock/unit, tách khỏi live.

Checkout mới tạo PENDING/PENDING_PAYMENT. Chưa có PayOS link/QR/webhook, cash
confirmation, reconciliation, pending preview và ACTIVE learning/content/progress.
Units/sessions chưa có edit/delete API; cancel class chưa tự nhả pending holds.
Không đánh dấu toàn Phase 2 hoàn tất.
