# Backend integration — Prompts 5–8

Cập nhật xác minh ngày 2026-10-04 tại [full audit](./FULL_AUDIT_2026_10_04.md):
121 unit/49 mocked E2E, local live FE/BE/DB/SMTP và expiry pass. Báo cáo dưới đây
giữ nguyên kết quả/môi trường lịch sử của lượt triển khai ngày 2026-10-02.

Ngày: 2026-10-02. Tiếp tục từ [Prompts 1–4](./IMPLEMENTATION_PROMPTS_1_4.md), đọc
[prompt requirements](./PROMPTS_BACKEND_INTEGRATION.md) và [UI rules](../ui-rules.md).
Backend source xác nhận vẫn là `feat(api)/booking-sprint`,
`577af2f0e11607ed827be9ac1f9682a9c629f7b8`. Không có contract drift.

## Route coverage

| Prompt | Product routes | API và hành vi |
| --- | --- | --- |
| 5 | `/courses`, `/courses/[courseId]`, `/classes/[classId]` | Public categories/courses/course detail/course classes/class detail; giá từ course; filters/pagination đúng DTO |
| 5 | `/courses/[courseId]/units/[unitId]` | GET course detail, xác nhận unit membership; rail 300px/content scroll độc lập; URL/reload/history, native drawer |
| 6 | `/cart` | STUDENT cart GET/POST/DELETE, class quantity 1, 20-item limit; snapshot/current price/availability/server total, refetch mutation/errors |
| 7 | `/checkout` | Body chỉ paymentType; tất cả CASH/PAYOS order receipts; double-submit guard; unknown-result read orders/cart trước retry chủ động |
| 7 | `/orders`, `/orders/[orderId]` | STUDENT owner, status/pagination URL, snapshot/deadline, 403/404 và server expiry refresh |
| 8 | Các route của Prompt 1–7 | Quality, mocked browser journeys, responsive/keyboard/security và live environment audit |

PublicShell giữ Ocean Editorial và session context để nút add-to-cart kiểm tra
identity. AppShell thêm catalog/cart/orders cho học viên. Home có CTA tới catalog.
API adapter chỉ thêm GET browse, student cart/orders và exact DELETE cart item;
payment/cancel-order/learning endpoints không có controller vẫn bị từ chối.
safeReturnTo chấp nhận exact product routes và giữ query/hash, từ chối API path,
external URL, controls/backslash và identifier không hợp lệ.

Private cart/order state key theo userId và abort khi unmount, không browser cache
hoặc sessionStorage. Payload-free cart event chỉ yêu cầu đọc lại giỏ của phiên hiện
hành. Caller cancellation được kết hợp với deadline 15 giây của browser request;
mutation timeout không tự replay. Backend vẫn sở hữu permission/ownership,
transaction, giá, capacity và order status.

## QA evidence

| Check đã chạy | Kết quả |
| --- | --- |
| `pnpm check` | Biome/module boundaries, Next typegen/TypeScript, **109 unit tests / 22 files**, production build: pass |
| `pnpm test:e2e` | **43 Chromium scenarios: pass**; API mô phỏng, gồm regression Prompt 1–4 và 21 scenarios mới |
| Final focused E2E | **13 checkout/public catalog scenarios pass** sau nhãn header và capture drawer cuối; final production rebuild pass |
| Responsive/keyboard | 1440/768/390/375px: không tràn ngang; native menu/unit drawer, Escape/focus return, keyboard selection/remove |
| Visual review | Đã xem ảnh desktop/mobile catalog/unit viewer/cart/checkout/orders; đúng Ocean palette/font, mobile summary xếp sau danh sách |
| Live read-only health | FE3002 → BE: 502 API_UNAVAILABLE; live business smoke chưa chạy |

Runtime kiểm tra dùng **Node 22.20.0 và pnpm 12.6.0** qua toolchain pinned.

Mocked journeys kiểm tra public filters/deep links, rail/content scroll, drawer
Escape/focus return, invalid/empty descriptions, add/remove cart và lost response,
roles/account switch/logout, checkout multi-order/double-submit/unknown-result,
owner denial và server-confirmed expiry. Có hành trình liên tục public class →
login return → cart → checkout → own order → đổi account và từ chối order cũ.

Responsive kiểm tra 1440/768/390/375px, screenshot mock lưu tại
[screenshots](./screenshots/). Đây là bằng chứng frontend dùng API mô phỏng,
không chứng minh transaction/database hoặc email/Google provider đang chạy thật.

Ví dụ: [unit desktop](./screenshots/mock-public-unit-1440.png),
[unit drawer mobile](./screenshots/mock-public-unit-drawer-390.png),
[cart desktop](./screenshots/mock-cart-1440.png),
[cart mobile](./screenshots/mock-cart-390.png),
[checkout desktop](./screenshots/product-checkout-desktop.png),
[checkout mobile](./screenshots/product-checkout-mobile.png),
[orders mobile](./screenshots/product-orders-mobile.png).

Các lỗi được phát hiện và sửa trong QA: header login giữ query filters/unit;
logout có chủ đích không mang URL order private cũ vào lần đăng nhập account mới;
request có caller abort signal vẫn giữ deadline mạng. Integration journey và
boundary tests xác nhận ba hành vi này. Course/Class DTO public không có meeting
URL và không gọi admin lookup khi học viên xem order.

## Live blockers và phần chưa xác minh

- Không có backend listener ở cổng 3000; sibling BE chưa có node_modules. Live
  read-only GET `http://localhost:3002/api/v1/health/live` trả 502 API_UNAVAILABLE.
- BE chưa có `.env`/`.env.local` và cấu hình DATABASE_URL/test account trong workspace.
- Docker daemon không chạy; chưa có PostgreSQL test service khả dụng được xác nhận.
- Chưa có cấu hình/credentials Google OAuth và SMTP thực tế trong BE để chạy
  callback existing/new user hoặc nhận email xác thực.

Vì vậy chưa chạy live FE → BE admin create category/course/unit/activate và
class/session/open → STUDENT browse/cart/checkout/own orders; chưa xác minh live
conflicts/seat transactions/expiry job, Google hoặc SMTP. Không seed/reset DB ứng
dụng, không chạy destructive suite, không đổi BE business code/migrations.
Khi cung cấp môi trường, chạy smoke bằng tài khoản ADMIN/STUDENT test được cấp;
suite destructive chỉ dùng TEST_DATABASE_URL có tên DB kết thúc `_test` theo BE.

## Giới hạn sản phẩm và backlog

Checkout chỉ tạo PENDING order/PENDING_PAYMENT seat hold, **chưa hoàn tất thanh
toán hoặc cấp quyền học**. UI hiển thị điều này và tất cả orders CASH tách mentor.
Countdown là tham khảo; đọc lại BE ở deadline, không tự đổi EXPIRED/PAID/ACTIVE.
Cash OrderDto chỉ có mentorId, không gọi admin users bằng tài khoản STUDENT.

Backend cần bổ sung PayOS link/QR/webhook, mentor cash confirmation, payment
reconciliation, pending preview, ACTIVE enrollment/content/progress và email xác
nhận. Cancel class vẫn chưa tự nhả pending holds. Không đánh dấu toàn Phase 2
complete. Không commit/push/merge/deploy trong công việc này.

Chi tiết từng phần: [Prompt 5](./prompt-5-report.md),
[Prompt 6](./prompt-6-report.md), [Prompt 7](./prompt-7-report.md).
