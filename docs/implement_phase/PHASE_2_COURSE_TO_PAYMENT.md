# Phase 2 — Course registration, checkout, payment và enrollment

## 1. Mục tiêu

Hoàn thành hai journeys xuyên frontend/backend:

```text
ADMIN/MANAGER: category -> course -> units -> activate
  -> class + mentor + ONLINE/OFFLINE + schedule -> OPEN

STUDENT: browse course -> chọn class -> cart -> checkout
  -> trả đủ CASH hoặc PAYOS -> backend mở enrollment ACTIVE -> vào lớp
```

MENTOR xem và xác nhận cash order thuộc mentor snapshot; ADMIN/MANAGER xem đối soát.
Phạm vi ngang [Phase 2 backend](../../../Mindy-BE/docs/implement_phase/PHASE_2_COURSE_TO_PAYMENT.md),
gộp catalog, class, cart/order, payment và enrollment trong cùng phase. Không đẩy
payment/enrollment sang phase riêng của frontend.

## 2. Trạng thái hiện tại và điều kiện bắt đầu

Ngày 2026-10-02, FE chưa có feature catalog/classes/commerce/payments/learning;
BE local `608ff54` chưa có các module nghiệp vụ Phase 2. Toàn bộ endpoint Phase 2
trong tài liệu này là **contract mục tiêu**, chưa là API đã triển khai.

- Phase 0 FE có adapter/quality gate; Phase 1 FE có session/role và users đúng DTO.
- BE Phase 1 cung cấp active STUDENT, ADMIN/MANAGER/MENTOR và ownership checks.
- Chốt DTO/Swagger/errors/read endpoints/capability theo mục 5 trước tích hợp.
- BE triển khai từng vertical slice và migrations tương ứng; staging có dữ liệu test.
- PayOS fake + mail sink dùng cho automated tests; live merchant credentials không
  bắt buộc để bắt đầu. Auth/security còn thiếu ở BE phải đóng trước nghiệm thu Phase 2.

Chỉ chuẩn bị UI/test fixtures trong khi chờ BE; không đưa fixture thành dữ liệu
production hoặc đánh dấu integration-complete khi chỉ chạy mock.

## 3. Quyết định nghiệp vụ phải giữ

1. Student mua **class**, không mua course template. Chỉ class OPEN hợp lệ được
   add/checkout; ONLINE/OFFLINE là thuộc tính class, không đổi mode trên order.
2. Course price là giá dùng chung; cart snapshot để hiển thị, giá chốt và total do
   BE tính tại checkout. Tiền số nguyên VND; client không gửi price/discount/total.
3. Cart nhiều class. PAYOS tạo một order cho cart; CASH tách một order mỗi mentor
   snapshot trong cùng transaction. Checkout luôn trả `orders[]`.
4. Mỗi order trả đủ một lần, một method cố định; không đổi method sau checkout.
   Cash confirmation chỉ mentor snapshot, admin/manager không xác nhận thay mentor.
5. Hold mục tiêu: PayOS 15 phút, cash 48 giờ, cấu hình do BE quyết định. FE đọc
   `expiresAt`, không hard-code TTL làm nguồn sự thật.
6. Cash pending enrollment PENDING_PAYMENT chỉ xem title/timetable. Không có meeting
   URL, material hoặc nội dung học. PayOS pending không có preview nội dung lớp.
7. Chỉ enrollment ACTIVE từ BE mới có full learning access. Return query/status
   provider, order state local và nút "đã chuyển tiền" không cấp quyền học.
8. Order hết hạn thành EXPIRED, enrollment pending CANCELLED, capacity được BE release.
   Checkout lại sau khi hết hạn theo validation BE; giữ lịch sử order.
9. Late PayOS payment thuộc đối soát REQUIRES_REVIEW; không tự mở access/refund.
10. Confirmation email PayOS do BE gửi sau commit. FE không tự gửi email hoặc rollback
    payment khi mail chưa tới. Chat/materials/attendance/judge vẫn ở phase sau.

## 4. Domain ownership và dependency frontend

| Feature mục tiêu | Ownership | Public entry / consumer |
| --- | --- | --- |
| `catalog` | Public/management category, course, course units | `client.ts`; `server.ts` chỉ nếu public server fetch thật |
| `classes` | Public/management class, sessions, lifecycle | Public entry cho route composition |
| `commerce` | Cart, checkout, own orders và order recovery | Public browser entry |
| `payments` | PayOS actions/feedback, mentor cash, reconciliation | Public browser entry |
| `learning` | My classes, pending preview và active content/progress presentation | Tạo khi BE read contract sẵn sàng |

Đây là ownership mục tiêu; không tạo sẵn module rỗng. Giữ `app -> features -> shared`.
App order route có thể ghép commerce summary với payments actions bằng ID/status
boundary rõ ràng; payments không import private commerce client/component.

Boundary check hiện chỉ cho `users -> auth/client`. Trước khi feature mới gọi API
authenticated, chốt và cập nhật `AGENTS.md`, architecture và script một cách tường
minh: cho các feature có consumer thật dùng `auth/client` như users, hoặc thiết kế
transport composition phù hợp. Không tắt boundary check hay tự mở mọi cross-feature
import. DTO chung chỉ đưa vào shared khi có ít nhất hai consumer thật.

## 5. Planning phase — chốt contract trước khi xây UI

### 5.1 Route map mục tiêu

Các route mới dưới đây là đề xuất FE, cần thống nhất navigation/return URLs với BE.

| Route | Role | Nội dung |
| --- | --- | --- |
| `/courses` | Public | Course list + category/mode/time filters |
| `/courses/[courseId]` | Public | Course units summary và open classes |
| `/classes/[classId]` | Public | Mentor/mode/timetable/price/capacity public |
| `/management/courses`, `/management/courses/new`, `/management/courses/[courseId]` | ADMIN/MANAGER | Course/unit/category creation và activation |
| `/management/classes`, `/management/classes/new`, `/management/classes/[classId]` | ADMIN/MANAGER | Class creation, schedule và lifecycle |
| `/cart`, `/checkout` | STUDENT | Cart và review/payment method |
| `/orders`, `/orders/[orderId]` | STUDENT owner | History, pending payment, payment return/cancel feedback |
| `/my-classes`, `/my-classes/[classId]` | STUDENT enrollment | Cash pending preview / active learning access |
| `/mentor/cash-orders` | MENTOR snapshot | Cash queue, order summary và confirmation |
| `/management/payments/reconciliation` | ADMIN/MANAGER | Late-payment review queue, read-only |

Filters/page nằm URL; secret/meeting URL/token không nằm query. Public CTA chưa login
về login với safeReturnTo; sau login vẫn phải revalidate class, không tự add/checkout.
Authenticated role khác STUDENT có feedback phù hợp, không thấy CTA mua hàng.

### 5.2 API target từ Phase 2 BE

Mọi path dưới đây sau `/api/v1`; chỉ thêm allowlist khi endpoint thật được triển khai.

| Nhóm | Method/path mục tiêu | Consumer FE |
| --- | --- | --- |
| Public catalog | GET `/course-categories`, `/courses`, `/courses/:courseId` | Filters, list/detail |
| Public class | GET `/courses/:courseId/classes`, `/classes/:classId` | Chọn class, public schedule |
| Management catalog | POST `/admin/course-categories`, `/admin/courses`; PATCH `/admin/courses/:courseId` | Category/create/edit course |
| Management units | POST `/admin/courses/:courseId/units`; PUT `/admin/courses/:courseId/units/order`; POST `/admin/courses/:courseId/activate` | Units/reorder/activate |
| Management class | POST `/admin/classes`; PATCH `/admin/classes/:classId`; POST `/admin/classes/:classId/sessions` | Create/edit/schedule |
| Class lifecycle | POST `/admin/classes/:classId/open`, `/start`, `/complete`, `/cancel` | Explicit lifecycle actions |
| Cart | GET `/me/cart`; POST `/me/cart/items`; DELETE `/me/cart/items/:classId` | Own cart |
| Checkout | POST `/me/cart/checkout` | `{ paymentType: 'CASH' \| 'PAYOS' }` → `orders[]` |
| Orders | GET `/me/orders`, `/me/orders/:orderId` | Own pending/history/detail |
| Cash preview | GET `/me/classes/:classId/preview` | Title/timetable DTO riêng |
| PayOS link | POST `/me/orders/:orderId/payments/payos` | Checkout URL/QR + expiry |
| Mentor cash | GET `/mentor/cash-orders`; POST `/mentor/cash-orders/:orderId/confirm` | Own mentor queue + full amount confirmation |
| Reconciliation | GET `/admin/payments/reconciliation` | Read-only staff queue |

`POST /payment-callbacks/payos` là BE/provider boundary; FE không gọi endpoint này
và không thêm vào browser adapter allowlist. Automated integration dùng BE fake
provider/test harness để phát callback hợp lệ.

Generic FE adapter hiện chỉ export GET/POST/PATCH; khi có reorder/remove consumers
cần thêm PUT/DELETE cùng method/path/Origin/cookie/body policy tests. Không mở cả
`/admin/*` hay `/me/*` bằng wildcard.

### 5.3 Các contract BE còn cần bổ sung/chốt

Phase 2 BE liệt kê write APIs nhưng chưa mô tả đầy đủ các read APIs phục vụ UI.
Những mục sau là dependency cần chốt, chưa tự đặt path trong API đã có:

| Khoảng trống | UI phụ thuộc | Điều kiện giải quyết |
| --- | --- | --- |
| Management course/category list/detail gồm inactive và units | Management deep link, edit/reorder/activate | Chốt authenticated query endpoints/DTO; public detail không thay được |
| Management class list/detail gồm DRAFT và private sessions/units | Schedule và lifecycle management | Chốt read endpoints, role, pagination và state actions |
| My enrollments/classes list, active class content/progress read | `/my-classes` và learning route | Chốt endpoints, enrollment status, ownership và ACTIVE-only full DTO |
| Cash queue order details/summaries | Mentor xác nhận từng order | List phải đủ summary hoặc bổ sung authenticated detail endpoint |
| Payment capability và current payment/review state | Chọn PAYOS, polling, late settlement | Chốt availability/read fields; không dựa vào frontend secret/guess |
| Public category/mode/time filters và pagination | URL filters/schema | Chốt query names, timestamp/date semantics và metadata |
| Cancel/return URLs | PayOS redirect tới own order | Chốt same-origin route, order identifier và safe redirect policy |
| Status/action/error codes | Conflict và expiry feedback | Chốt enum/code/HTTP, không dùng enum DB như DTO tự suy diễn |

Admin mentor picker có thể dùng GET `/admin/users?role=MENTOR&status=ACTIVE` đã có,
phải phân trang thật. BE vẫn validate mentor khi create/open. Session reschedule,
category update/deactivate và reorder/delete unit chưa có API rõ trong Phase 2;
không thêm action nếu backend chưa chốt scope/endpoint.

### 5.4 Request/response và hiển thị

- Course/category/class input theo DTO BE: code/slug unique, title, descriptions,
  category, price non-negative integer, score 0–100, capacity >0, date range hợp lệ.
  Đây là field/rule mục tiêu; field name/length cụ thể phải chốt bằng DTO trước code.
- Course unit reorder gửi đủ IDs/thứ tự theo contract; không làm đổi class đã copy.
- Class session startsAt < endsAt, nằm class date range; datetime gửi ISO theo BE.
  Date-only không tự convert qua UTC gây lệch ngày. Hiển thị lịch Asia/Ho_Chi_Minh.
- Add cart chỉ gửi identifier theo DTO BE; studentId/mentorId/status/price không
  thuộc payload student. Remove dùng classId path; quantity mỗi class là 1.
- Checkout response item tối thiểu: id/orderCode/paymentType/status/totalAmount/
  expiresAt/immutable detail summaries; cash có mentorId. Chốt safe mentor display
  summary để FE không phải gọi admin users từ student page.
- Order status/enrollment/payment là ba khái niệm khác nhau. Response phục vụ UI
  cần chỉ rõ access/read state, không suy từ `PAID` local để render học liệu.
- Tiền dùng `Intl.NumberFormat` VND; reject response vượt number-safe contract,
  không tính lại total làm nguồn sự thật hoặc dùng float cho amount.
- QR/link do BE cung cấp, validate shape và trusted HTTPS provider URL trước navigation;
  không render raw HTML/provider payload. Không chứa PayOS key/checksum secret ở FE.

## 6. Workstream A — Public catalog và course management

### FE-P2-A01 — Public browse/detail

- Course list active với category/mode/time filters theo query contract.
- Detail có public unit summaries và OPEN class options, mentor/mode/date/schedule,
  price/capacity theo API; không hiện meeting URL private.
- Filter/page giữ trong URL, abort requests cũ; skeleton/loading/empty/retry/404.
- CTA chọn đúng class; đầy/không OPEN không mua; BE revalidate khi add/checkout.
- Chỉ cache dữ liệu public không cá nhân nếu có invalidation policy sau activate/open.

Acceptance: student phân biệt ONLINE/OFFLINE và chọn class; inactive/private fields
không có trong HTML/response render; refresh/deep link giữ filters, mobile dùng được.

### FE-P2-A02 — Category/course/unit management

- Tạo category rồi inactive course, nhập giá nguyên VND và category hợp lệ.
- Edit course theo DTO, add units, reorder bằng bàn phím/buttons hoặc UI có keyboard
  fallback; disable save khi pending, reload detail sau commit.
- Activation action riêng; báo thiếu unit/category inactive/422/409 theo BE.
- Management list/detail phải dùng read APIs ở mục 5.3, không dùng public query để
  giả lập course inactive. Chưa có category update/delete thì không thêm nút đó.

Acceptance: tạo/activate course rồi xuất hiện public; course chưa đủ unit không
activate; reorder persisted và UI không tự sửa units của class đã tạo.

## 7. Workstream B — Class và scheduling management

### FE-P2-B01 — Create class và sessions

- Chọn active course/mentor, code/mode/date range/capacity theo BE DTO.
- BE copy units trong transaction; FE đọc class detail sau create, không tự copy.
- Schedule session theo class units, tên/thời gian và fields mode theo DTO.
- Kiểm tra input cơ bản ở form; conflict mentor/session thuộc validation cuối BE.
- Hiển thị timeline/timezone rõ; chưa có reschedule API thì chưa cung cấp mutation đó.

Acceptance: DRAFT class có copied units, schedule persisted, mentor inactive hoặc
time overlap có feedback; request lỗi không hiển thị class đã OPEN.

### FE-P2-B02 — Lifecycle actions

- Actions riêng open/start/complete/cancel theo trạng thái/allowed actions từ BE.
- Confirm action ảnh hưởng vận hành; disable khi pending, fetch state mới sau commit.
- OPEN cần units/sessions hợp lệ, active mentor và không conflict.
- 409 do người khác thay state: báo conflict và reload detail, không optimistic status.

Acceptance: `DRAFT -> OPEN -> IN_PROGRESS -> COMPLETED` và cancel theo BE policy;
chỉ OPEN xuất hiện purchasable, invalid transition không thành công ở UI.

## 8. Workstream C — Cart, checkout và own orders

### FE-P2-C01 — Cart

- STUDENT-only, GET cart sau session bootstrap, add/remove đúng identifiers.
- Multi-class summary mode/mentor/time/price snapshot; không có quantity editor.
- Add trùng/đã enrollment/full/not OPEN có conflict feedback và read lại cart/class.
- Remove thành công refetch cart; abort/ignore response khi logout hoặc đổi identity.
- Empty state về catalog; không dùng storage cart để bỏ qua BE ownership.

Acceptance: server cart sống qua reload, chỉ own data; delayed request không hiện
cart user trước; không tự reserve chỗ chỉ vì add cart thành công.

### FE-P2-C02 — Checkout review và transaction outcome

```text
GET cart -> review -> chọn CASH/PAYOS -> POST checkout({ paymentType })
  -> parse orders[] -> invalidate cart/orders -> mở kết quả thanh toán
```

- Hiển thị snapshot và cảnh báo giá/chỗ revalidated tại checkout; total cuối dùng BE.
- Disable double submit; mutation không auto retry do timeout/lost response.
- PAYOS một order; CASH có thể nhiều order, nhóm mentor và từng amount/deadline riêng.
- Mọi item lỗi → không giả lập partial success; 409/422 read lại cart và hướng dẫn sửa.
- Nếu kết quả chưa rõ: thông báo đang kiểm tra, GET own orders + cart. Nếu BE không
  cung cấp identifier đủ để correlate, cho xem danh sách pending orders, không tự
  chọn bừa order mới nhất hoặc POST checkout lại.
- Cart rỗng sau successful checkout không được coi là mất order; tiếp tục payment
  từ pending orders. Client không tạo idempotency table/key API chưa có contract.

Acceptance: payload chỉ paymentType; multi-mentor result render hết orders; reload/
retry không tạo order mới; last-seat conflict có UI và BE concurrency test thật.

### FE-P2-C03 — Orders list/detail và expiry

- Own orders paginated, pending/paid/expired labels theo enum DTO; detail snapshots
  không đổi theo course/class hiện tại.
- Deadline/countdown lấy expiresAt; server clock/reference time theo contract nếu
  cần đồng bộ. Countdown về 0 trigger read, không tự ghi EXPIRED ở backend.
- Read paid/expired/review state và enrollment để đưa action đúng.
- Sau expiry chỉ checkout lại khi BE giải phóng hold và revalidation chấp nhận.
- History 404/403 không lộ order người khác. Không có action đổi method hoặc tự cancel
  order nếu BE chưa cung cấp; provider cancel redirect chỉ là tín hiệu cần đọc lại.

Acceptance: refresh/deep link khôi phục payment đúng order, pending cash/PayOS khác
nhau rõ, expiration không tự cấp quyền hoặc xóa lịch sử.

## 9. Workstream D — Cash confirmation và limited access

### FE-P2-D01 — Student cash result/preview

- Sau checkout hiển thị từng mentor/order code/full amount/expiresAt và hướng dẫn
  nộp tiền trực tiếp cho mentor; không có nút tự xác nhận đã trả tiền.
- CTA pending class đọc `/me/classes/:classId/preview` với DTO riêng.
- Chỉ title class units/sessions và timetable; không tải full content rồi che CSS.
- Poll/refetch khi quay lại/focus hoặc refresh thủ công để thấy mentor đã confirm.

Acceptance: cash PENDING_PAYMENT xem preview đủ, không meeting URL/material/content
trong response/DOM/cache; một order PAID không làm active các order mentor khác.

### FE-P2-D02 — Mentor cash queue/confirm

- Queue chỉ order thuộc mentor snapshot; hiển thị student summary an toàn từ API,
  class details, total, expiry/status; không cần admin user query ở mentor page.
- Xác nhận đã nhận **đủ** tiền, receivedAmount bằng total; optional referenceCode/
  note theo DTO. Confirm dialog hiện đúng order/amount, pending disable.
- Không cho trả thiếu/trả góp. BE check role/snapshot/deadline và giữ audit.
- Timeout: đọc lại queue/detail để xác định kết quả, không auto confirm lần nữa.
- Duplicate retry theo idempotent BE contract; expired/409 refetch, sai mentor 403.

Acceptance: mentor đúng confirm thì order PAID và toàn bộ enrollment/progress của
order active; mentor khác/admin/manager không confirm; no optimistic learning access.

## 10. Workstream E — PayOS và reconciliation

### FE-P2-E01 — Tạo/retry payment link

- Chỉ order PAYOS/PENDING chưa hết hạn; call link endpoint **sau** checkout.
- Loading/link/QR/expiry, provider failure và feature disabled 503 có feedback riêng.
- Retry trên cùng orderId, không checkout lần nữa để lấy link; giữ pending order
  trong history để khôi phục khi reload hoặc provider unavailable.
- PAYOS disabled: báo không khả dụng; cash checkout mới vẫn dùng được. Không đổi
  existing PayOS order sang cash hoặc tự tạo cash order thay thế khi còn hold.
- External navigation chỉ URL provider HTTPS đã chốt; không URL do query user nhập.

Acceptance: lỗi link không mất order/giữ chỗ và retry idempotent theo BE; secrets
không ở client/env public; response schema invalid không mở URL tùy ý.

### FE-P2-E02 — Return/cancel, polling và payment state

```text
Provider redirect về order route
  -> GET own order / payment read contract
  -> PENDING: chờ xác nhận + polling có giới hạn
  -> PAID: đọc enrollment -> ACTIVE content
  -> EXPIRED / REQUIRES_REVIEW: hướng dẫn hết hạn / đối soát
```

- Query `status`, `code`, `cancel` hoặc QR scan không là bằng chứng đã thanh toán.
- Poll reads có backoff/giới hạn (chốt ví dụ 2s rồi tăng tối đa 10s, dừng tự động
  sau 2 phút); có nút kiểm tra lại. Dừng khi unmount/logout/tab hidden hoặc terminal
  state, resume/refetch khi visible theo policy. Dùng expiry BE để recheck deadline.
- Browser đóng vẫn được webhook BE xử lý; quay lại đọc trạng thái, không call webhook.
- Cancel redirect không tự expire/cancel order; cho tiếp tục order khi BE còn PENDING.
- PAID nhưng enrollment chưa đọc được: thông báo đang đồng bộ, refetch; không mở nội
  dung từ cached purchase state. Mail outage không đổi payment success thành failed.

Acceptance: fake redirect success nhưng BE PENDING vẫn pending; duplicate/late callback
không làm UI lặp side effects; reload sau payment đọc đúng state từ BE.

### FE-P2-E03 — Staff reconciliation

- ADMIN/MANAGER đọc queue late settlement/REQUIRES_REVIEW theo safe DTO và pagination.
- Hiển thị order code, amount, payment/order status và reason/timestamp được BE cho phép.
- Không raw signature/key/provider credential; không nút refund/grant enrollment
  tự động hoặc cash confirm thay mentor trong Phase 2.

Acceptance: student nhận notice chờ đối soát và không full access; staff thấy đúng
queue, role khác bị chặn; cleanup/refund thực hiện theo quy trình vận hành ngoài scope.

## 11. Workstream F — Enrollment và learning access

### FE-P2-F01 — My classes và access-aware detail

- Chỉ triển khai khi BE có read endpoints ở mục 5.3; phân biệt enrollment pending,
  active/cancelled với order status và payment attempt.
- Cash pending route dùng preview DTO; PAYOS pending đưa về own order, không gọi
  full content. ACTIVE query trả class units/sessions/full content theo quyền BE.
- Không tải protected payload trước session/enrollment check; no-store và xóa state
  khi logout, expiry/revocation, identity change hoặc BE 403.
- Progress UI chỉ đọc rows BE khởi tạo; chốt mutation riêng trước khi có nút hoàn
  thành unit. File/material/assignment/attendance chưa có consumer ở Phase 2.

Acceptance: cash confirm/valid PayOS callback mở đúng class của student owner;
pending/cancelled/student khác deep-link không nhận nội dung private. API thiếu
active read contract là blocker nghiệm thu phần learning, không thay bằng local UI.

## 12. Error, security và operational contract

| HTTP / tình huống | UX và recovery |
| --- | --- |
| 401 | Auth recovery theo Phase 1, hết phiên xóa private state |
| 403 | Forbidden, không retry/mở access; role/ownership do BE |
| 404 | Resource unavailable hoặc private, không lộ dữ liệu qua cache |
| 409 | Full/not OPEN/enrollment/expired/invalid transition; refetch resource |
| 422 | Field feedback theo actual code/details, không gửi lại field lạ |
| 503 payment | Giữ order, retry link cùng ID; capability disabled có thông báo |
| Network mutation / timeout | Kết quả chưa rõ, read lại resource/orders trước action |
| Clock/deadline | Countdown tham khảo; state cuối đọc BE |

- Không cache dữ liệu cart/order/learning/mentor/staff giữa users; không log PII,
  cookie, payment credential, QR sensitive payload hoặc callback query.
- Chốt CSRF/Origin ở frontend và BE deployment; UI role check không thay guards.
- Request ID cho checkout/cash/link lỗi, BE audit/metrics là dependency vận hành.
- Chỉ backend giữ PayOS config/webhook/email workers. Live merchant account/credentials
  và webhook do user cấu hình sau, không là điều kiện đóng bộ tài liệu hoặc fake smoke.

## 13. Testing plan

### 13.1 Unit và adapter integration

- Course/class input ranges, integer price, date-only/timezone, lifecycle presentation.
- Public/order/enrollment/payment DTO schemas, checkout `orders[]`, safe QR/link URL.
- Filters/pagination encoding, field whitelist, error recovery và stale request cancel.
- Method/path allowlist cho GET/POST/PATCH/PUT/DELETE; Origin/cookies/no-store/body limit.
- Pending preview DTO không chứa secret; auth and read policy phân biệt CASH/PAYOS.
- Poll backoff/stop/unmount/logout, deadline recheck, mutation unknown-result recovery.

### 13.2 Browser E2E với API mô phỏng

- Public browse/filter/deep link ONLINE/OFFLINE, empty/full/unavailable class.
- Manager category/course/unit/reorder/activate → class/schedule/open → public view.
- Unauthorized role/deep link, keyboard/mobile, field errors/conflicts/loading.
- Multi-class cart add/remove; PAYOS one order và CASH split multi-mentor orders.
- Giá thay đổi, last-seat conflict, cart item lỗi, checkout response lost → pending
  order recovery, double click không submit trùng.
- Cash pending preview, mentor full confirmation, sai mentor/expired/duplicate feedback.
- PayOS disabled/503/link retry, forged success query, pending → paid/active polling,
  cancel redirect still pending, expiry/late review và stop polling.
- Own orders/classes, 403 khi student khác, delayed data sau logout và account switch.
- Private fields không render/không fetch full content từ cash pending journey.

### 13.3 Integration smoke FE → BE staging + provider fake

1. Provision test users bốn roles; tạo/activate course, create/schedule/open class.
2. Student browse/add multi-class/cart/checkout cash theo hai mentors.
3. Pending preview limited; đúng mentor confirm từng order, đọc ACTIVE content và
   progress thật; sai mentor/admin/student khác nhận forbidden.
4. Checkout PayOS → fake provider link → signed callback qua BE harness → own order
   PAID/enrollment ACTIVE; mail sink nhận confirmation sau commit.
5. Duplicate/wrong amount/invalid signature/late callback theo BE suite; FE đọc kết
   quả và không tự cấp access. Mail retry không lặp UI/payment side effects.
6. Expiry job release hold; refresh read EXPIRED/CANCELLED, checkout lại khi BE cho phép.
7. Provider disabled: cash vẫn hoạt động; fake return query không mở quyền học.

BE bắt buộc test transaction rollback, oversell/locks, webhook signature/idempotency,
outbox uniqueness và migration constraints. FE smoke phối hợp kiểm tra end-to-end,
không dùng mock để tuyên bố các invariants BE đã pass. Live PayOS smoke là bước sau
khi user cấu hình merchant/webhook, ghi trạng thái riêng trong progress.

## 14. Thứ tự triển khai đề xuất

1. Chốt contract gaps ở mục 5, feature ownership/auth dependency và API revision.
2. FE-P2-A01/A02 theo BE `course-catalog` slice; public + management cùng chạy được.
3. FE-P2-B01/B02 theo BE `class-operations`; schedule/open/public class.
4. FE-P2-C01/C02/C03 theo BE `commerce-orders`; cart/checkout/own orders/recovery.
5. FE-P2-D01/D02 + F01 theo BE cash/enrollment access transaction; preview → ACTIVE.
6. FE-P2-E01/E02 theo PayOS fake adapter/link/webhook, bounded polling/access refresh.
7. FE-P2-E03, mail-sink/live BE smoke, security/role/ownership và responsive QA.
8. `pnpm check`, relevant E2E, staging evidence, cập nhật API/architecture/progress.

Không hoàn tất toàn bộ UI mock trước rồi mới kiểm tra API; từng slice có contract,
UI và smoke với endpoint BE thật. Backend-owned migrations theo kế hoạch BE,
frontend không tạo schema/migration thay backend.

## 15. Phân công hai người

| Người | Ownership | Điểm phối hợp |
| --- | --- | --- |
| A | Catalog/public/management, classes/schedule/lifecycle, learning read UI | B review contracts/access và browser tests |
| B | Cart/checkout/orders, PayOS, mentor cash/reconciliation, adapter policy | A review multi-order/payment/preview journeys |

Chốt checkout orders array, mentor summaries, payment state/access read và expiry
trước code song song. Một owner sửa shared contracts/adapter trong mỗi nhánh;
người còn lại review. App composition ghép features; không import private modules.

## 16. Exit criteria

- [ ] API contract gaps được BE chốt/triển khai, DTO/allowlist/revision docs cập nhật.
- [ ] Feature auth dependencies có quyết định rõ và boundary check vẫn pass.
- [ ] ADMIN/MANAGER tạo category/course/units, activate, tạo class/schedule và OPEN.
- [ ] Public browse/filter course/classes ONLINE/OFFLINE, không lộ private meeting URL.
- [ ] STUDENT cart multi-class/add/remove và checkout chỉ gửi server-approved fields.
- [ ] Checkout `orders[]`, CASH split mentor và PAYOS one order render đúng.
- [ ] Lost response/double submit/reload phục hồi own pending orders, không tạo order mới.
- [ ] Giá/chỗ/conflict/expiry hiển thị theo BE; BE oversell/rollback suite pass.
- [ ] Cash pending chỉ title/timetable; đúng mentor confirm đủ tiền mới ACTIVE.
- [ ] PayOS link retry cùng order, disabled không phá cash, redirect không cấp access.
- [ ] Polling có giới hạn/cancel, duplicate/late payment phản ánh đúng backend state.
- [ ] Staff reconciliation read-only và late payment không tự mở enrollment/refund.
- [ ] My classes/ACTIVE content/progress read qua API thật, ownership/403 có test.
- [ ] Private data cleanup, role/deep link, accessibility/mobile/feedback được nghiệm thu.
- [ ] Unit/adapter/browser E2E, `pnpm check` và staging fake-provider smoke pass.
- [ ] BE migration/transaction/auth/security/email outbox dependency được nghiệm thu.
- [ ] `docs/progress.md` ghi rõ hoàn tất, dependency và live PayOS smoke còn chờ config.

## 17. Ngoài scope

- Live PayOS merchant registration/credential/webhook setup và giao dịch tiền thật.
- Trả góp/coupon/tax invoice/refund tự động, đổi method hoặc tự cấp chỗ cho late payment.
- Admin manual-payment endpoint trong core milestone cũ: Phase 2 mới dùng mentor cash
  confirmation, không triển khai song song khi chưa có quyết định BE.
- File/material upload, attendance, chat/notification, assignments, whiteboard/judge.
- Full course authoring editor, room-conflict engine, offline cache private data.
- Compiler playground hiện có không thuộc catalog/checkout/enrollment core flow.
