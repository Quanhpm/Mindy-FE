# Prompt 7 — Checkout và own orders

2026-10-02. Backend đã đối chiếu lại branch `feat(api)/booking-sprint`, HEAD
`577af2f0e11607ed827be9ac1f9682a9c629f7b8`; không có contract drift hoặc chỉnh BE.
Đã đọc AGENTS, architecture/contracts/progress, Prompt 7, UI rules và source
controllers/DTO/services/exceptions commerce, class offers và enrollment.

## Routes và contract

| FE | API thực tế sau `/api/v1` |
| --- | --- |
| `/checkout` | GET `/me/cart`, GET `/me/orders?page=1&pageSize=100`, POST `/me/cart/checkout` |
| `/orders` | GET `/me/orders?page&pageSize&status` |
| `/orders/[orderId]` | GET `/me/orders/:orderId` |

Chỉ STUDENT owner có consumer. FE dùng `canPurchaseClasses` và SessionProvider;
backend role/ownership guards vẫn quyết định mỗi API. Checkout payload chỉ
`{ paymentType: CASH hoặc PAYOS }`. Không gửi giá/tổng/quantity/studentId/mentorId.
Response luôn `{ orders: [...] }`, schema từ chối empty/shape sai như kết quả chưa
xác định. CASH hiển thị tất cả đơn chia theo mentor; PayOS hiển thị một đơn gồm
toàn bộ lớp. Không redirect riêng orders[0].

Order gồm id/orderCode/paymentType/status/totalAmount/expiresAt/paidAt/mentorId/
createdAt/details. Detail snapshot có id/classId/courseTitle/className/priceAmount/
quantity=1/totalAmount. Các snapshot, tổng tiền, ngày tạo và deadline được đọc trực
tiếp từ response. Mentor tiền mặt chỉ hiển thị mentorId; không gọi admin users.
Status chỉ PENDING/PAID/EXPIRED/CANCELLED; list status/page/pageSize nằm trên URL.

## Checkout và unknown-result recovery

`CheckoutFlow` có consumer thực tại CheckoutPage; sở hữu request/lifecycle của
một mounted student. Guard đồng bộ khóa double-submit trước cả React render.
Mutation không tự retry lỗi mạng/5xx/response invalid. 401 guard vẫn dùng cơ chế
phục hồi tối đa một lần đã có trong auth; 403/409/422 không replay.

- Trước tạo đơn: đọc cart và recent own orders làm baseline.
- API success: giữ đủ receipts authoritative, announce cart changed không payload,
  đọc lại cart. Cart-read lỗi không xóa receipts hoặc báo checkout thất bại giả.
- Timeout/5xx/invalid response: khóa submit và đọc lại own orders/cart. Đơn mới
  liên quan đủ các classIds cùng phương thức và cart không còn các lớp đã thử
  được hiển thị với thông báo “đã tìm thấy các đơn liên quan”, từng status theo BE.
- Cart trống một mình không được coi là thành công; partial orders vẫn giữ kết
  quả chưa xác định. Baseline của attempt giữ nguyên qua các lần kiểm tra.
- Chỉ khi đọc **cả hai** API thành công, cart còn đủ các lớp hợp lệ và chưa tìm
  thấy đơn liên quan mới, mới cho nút “Tạo đơn lại sau khi kiểm tra”. User phải
  chủ động nhấn; không tự POST lần hai. Nếu đọc thiếu/lỗi/cart đổi: tiếp tục khóa,
  có kiểm tra lại hoặc xem lịch sử đơn.
- Lỗi nghiệp vụ 409 như CLASS_FULL/CLASS_NOT_OPEN/CLASS_ALREADY_ENROLLED được
  dịch tiếng Việt và refetch cart/orders. isPurchasable từ cart không đại diện
  capacity: CLASS_FULL có thể vẫn trả isPurchasable=true, backend kiểm tra lại
  mỗi checkout. FE không báo còn chỗ từ flag này.

Client requests đi qua public `auth/client` và `cart/client.getCart`; approved
dependency `orders -> auth/client, cart/client` do root cập nhật. Không có cache
cart fixture hoặc browser storage. UserId key và disposal abort reads/mutation,
chặn late response của account trước. Mất phiên/đổi account unmount private state.

## Status/expiry và giới hạn backend

Order detail countdown chỉ tham khảo. Đến deadline, FE gọi GET detail ngay và mỗi
30 giây khi server vẫn PENDING; user cũng có nút cập nhật. Không tự set EXPIRED,
PAID hay enrollment ACTIVE. EXPIRED/CANCELLED chỉ hiện khi response BE trả status.
403/404 xóa data cũ và dừng polling; invalid UUID không gửi API.

Checkout là tạo đơn/giữ chỗ, **chưa hoàn tất thanh toán hoặc cấp quyền học**.
Không có PayOS link/QR, cash confirmation hoặc cancel-order API trong checkout
BE này; UI nói rõ và không tạo thao tác giả. Root giữ backlog payment/learning.

## Ocean Editorial và kiểm tra

Sử dụng shell thật, Ocean tokens global (--green/--ink/--muted/--line/--soft),
font Avenir Next, form/button primitives đã có và CSS Module riêng. Checkout hai
cột review/summary chuyển một cột ở mobile; orders là các section có đường kẻ,
status bằng chữ, snapshot/details dễ đọc và không thêm artwork/metadata giả.

- Pinned Node22.20.0/pnpm12.6.0; scoped Biome pass không warning.
- 16 scoped unit tests pass: double-submit/all receipts, unknown result và kiểm
  tra cả hai API, empty/partial recovery, manual retry, stale-owner abort,
  realistic CLASS_FULL=true flag và closed-class=false flag, exact payload,
  owner403, filters/schemas/countdown không chuyển status.
- Full `tsc --noEmit` pass sau Next route typegen root; root chạy combined build
  và E2E cuối, không chạy server/build đồng thời ở agent.
- 7 mock E2E scenarios tại tests/e2e/checkout-orders.spec.ts: CASH/PayOS,
  double-submit, lost result/recovery lock, roles/owner403/invalid ID,
  URL filters/pagination/account change/logout cleanup, expiry server reread.
  Có screenshot checkout/orders/detail desktop1440/mobile390 và no-overflow
  checks1440/768/390/375; root ghi kết quả thực sau suite và visual review.

Mock E2E/unit không phải live smoke. Môi trường chưa có BE.env/DATABASE_URL,
dependency/runtime service ở port3000 và Docker đang tắt; read-only live health
qua FE3002 trả502 API_UNAVAILABLE theo kiểm tra root. Chưa live Google/SMTP/
checkout/database; không chạy seed/reset/migration hoặc sửa BE để vượt blocker.
Không commit/push/merge/deploy.

## Final combined verification — 2026-10-02

Root `pnpm check` passed with pinned Node 22.20.0/pnpm 12.6.0, 109 unit tests and
production build. Full mocked Chromium suite: 43 passed; final checkout/public
catalog rerun: 13 passed, including all 7 checkout/orders scenarios. Viewed desktop/
mobile checkout/orders/detail captures; responsive 1440/768/390/375 and keyboard
checks passed. Earlier pending browser/build notes are superseded by this evidence.
Live BE/Google/SMTP remain unverified;
see [combined report](./IMPLEMENTATION_PROMPTS_5_8.md).
