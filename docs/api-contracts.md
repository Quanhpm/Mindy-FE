# API contract — NestJS feat(api)/booking-sprint / 577af2f

Đối chiếu controller/DTO/guard/service checkout `../Mindy-BE` ngày 2026-10-02,
HEAD `577af2f0e11607ed827be9ac1f9682a9c629f7b8`. Backend không đổi revision.
Tất cả path bên dưới được thêm prefix `/api/v1`. Schemas FE kiểm tra runtime;
backend sở hữu auth, permission, transaction và lifecycle.

## Identity và session — Prompt 1

| Method | Path | Response |
| --- | --- | --- |
| GET | /health/live | `{ status: 'ok', timestamp }` |
| POST | /auth/login; /auth/refresh; /auth/email/verify | `{ user, accessTokenExpiresAt }` + HttpOnly session cookies |
| GET | /auth/me | `User` |
| POST | /auth/logout; /auth/logout-all | 204 + clear cookies |
| POST | /auth/register; /auth/email/resend | 202 `{ message }`, không cấp session |
| GET/POST | /admin/users | list page / created `User` |
| GET | /admin/users/:userId | `User` |
| PATCH | /admin/users/:userId/status | `User` |

Roles chỉ ADMIN, MENTOR, STUDENT; mọi management API chỉ **ADMIN**.
User status PENDING_VERIFICATION, ACTIVE, SUSPENDED. User gồm id/email/phone
nullable/displayName/role/status/lastLoginAt nullable/createdAt.

- Login: email ≤320, password 1–128, deviceName tùy chọn ≤150.
- Admin create: email ≤320, displayName 1–150 có ký tự khác khoảng trắng,
  password **12–128**, phone tùy chọn 7–32, role. Không nhận status.
- Register: email ≤320, password **6–128**, displayName 1–150 có ký tự khác
  khoảng trắng, phone tùy chọn 7–32. Không gửi role/status; luôn STUDENT chờ xác thực.
- Verify email: token 32–512 và deviceName tùy chọn. FE chỉ xác thực khi user
  nhấn nút, giữ token ngoài browser storage. Resend chỉ gửi email.
- User list: page ≥1, pageSize 1–100, role/status tùy chọn; createdAt DESC.
  Chưa có keyword search/sort/profile edit/password reset/role edit/avatar upload.

Access cookie Path=/, refresh cookie Path=/api/v1/auth/refresh. Browser gọi
same-origin adapter, không lưu token/user trong localStorage. 401 guard phục hồi
session và replay tối đa một lần nếu identity/generation vẫn đúng; 403/422 và
network mutation failure không replay. Authenticated mutations đọc `/auth/me`
dưới cùng session lock, kiểm tra identity trước POST/PATCH/PUT/DELETE và giữ lock
đến khi request kết thúc. Nếu cookies thuộc account khác, FE dừng mutation và
reload session. UserId/generation chỉ ở memory, không gửi owner hint trong body.
Login/verify/Google complete/callback finalization/refresh/logout được serialize
bằng queue trong tab và cùng WebLock giữa các tab. Logout/login thông báo các tab; private UI unmount
khi mất phiên. Google callback existing user có marker cố định, được tiêu thụ một
lần sau đọc identity hợp lệ rồi thông báo các tab, không chứa token/user data.

## Google navigation và onboarding — Prompt 2

| FE/adapter | Backend |
| --- | --- |
| Login/Register Google link | GET /auth/google?returnTo=... |
| GET /api/v1/auth/google/callback | Validate query, 303 về `/login/google/callback`; chưa exchange BE hoặc cấp session cookies |
| /login/google/callback → POST /api/v1/auth/google/callback | Dưới browser session lock, adapter gọi GET /auth/google/callback?code&state&error và trả `{ redirectTo }` cùng cookies đã kiểm tra |
| /register/complete | GET /auth/registration-context; POST /auth/google/complete-registration |

Google start/callback dùng dedicated adapters; OAuth redirect URI của BE giữ nguyên.
Callback POST bắt buộc Origin đúng, JSON body hợp lệ và không có query. Trang
callback chỉ exchange một lần, bỏ code/state khỏi URL và không lưu vào storage.
Session cookies được áp dụng khi browser vẫn giữ lock để tránh late refresh ghi đè.
Generic JSON adapter vẫn từ chối redirect. Start chỉ redirect tới HTTPS
accounts.google.com đúng OAuth path; callback chỉ về APP_ORIGIN và route an toàn đã chấp nhận. Query phụ của Google
không thuộc DTO bị bỏ; query hợp lệ bị trùng/quá dài bị từ chối.

`google_oauth_state` chỉ forward callback, Path=/api/v1/auth/google/callback.
`registration_intent` Path=/api/v1/auth chỉ forward context/complete. Cookie
callback cần đúng path, HttpOnly/SameSite=Lax, không Domain; HTTPS cần Secure.
Context: `{ email, displayName: string|null, avatarUrl: string|null, expiresAt }`.
Email chỉ đọc; tên/avatar được prefill. Complete chỉ gửi
`{ displayName, phone?, deviceName? }`; response session như login.

Registration intent hợp lệ được ưu tiên ở trang hoàn tất hồ sơ ngay cả khi còn
session của account trước; chỉ submit hoàn tất mới cấp session cho user mới.
Existing Google user nhận session và safe return path. Sau onboarding user mới
về role home: controller complete không trả `returnTo`, dù service có giá trị đó.
Intent hết hạn có nút bắt đầu Google lại; callback/disabled lỗi hiện ở login.
Hướng dẫn cấu hình OAuth origin/redirect URI tại
[prompt-1-2-report](./implement_phase/prompt-1-2-report.md).

## Quản trị catalog — Prompt 3

| Method | Path | Response/điều kiện |
| --- | --- | --- |
| GET | /course-categories | Page active categories |
| POST | /admin/course-categories | Category, ADMIN |
| GET/POST | /admin/courses | Management page / inactive detail |
| GET/PATCH | /admin/courses/:courseId | Management detail |
| POST | /admin/courses/:courseId/units | Added CourseUnit |
| PUT | /admin/courses/:courseId/units/order | Updated management detail |
| POST | /admin/courses/:courseId/activate | Active management detail |

Categories list page/pageSize; create `{ name, slug?, description? }`.
Không gửi slug rỗng; backend tự sinh khi bỏ slug. Chưa có edit/delete/inactive list.
Course list page/pageSize/categoryId/isActive; không search/sort giả.
Create `{ categoryId, code, title, description?, priceAmount }`, course inactive.
Price số nguyên VND không âm. PATCH chỉ categoryId/title/description/priceAmount,
không nhận code/isActive; description null để xóa mô tả. Activate command cần
category active và ít nhất một unit.

Management course fields gồm id/code/title/description/priceAmount/category,
isActive/createdAt/updatedAt. Detail thêm units[] với
id/unitNumber/title/description/requiredScorePercent.
Add `{ title, description?, requiredScorePercent? }`, score 0–100, tối đa 2 số
thập phân, mặc định 80. Reorder `{ unitIds }` là toàn bộ permutation, giới hạn 200
IDs theo DTO. Units chỉ add/read/reorder; không có edit/delete/save description.
Reorder không thay đổi snapshot units của lớp đã tạo. 409 refetch nguồn server.

Product routes: /management/course-categories, /management/courses,
/management/courses/new, /management/courses/[courseId]. Course fields ở tab riêng;
unit workspace dùng `?unitId=UUID` (hoặc new), rail/content cuộn độc lập, drawer
mobile. Invalid unit thuộc course khác hiển thị unavailable, không tự sửa URL.

## Quản trị classes/sessions — Prompt 4

| Method | Path | Response |
| --- | --- | --- |
| GET/POST | /admin/classes | Management page / DRAFT detail |
| GET/PATCH | /admin/classes/:classId | Management detail |
| POST | /admin/classes/:classId/sessions | Updated management detail |
| POST | /admin/classes/:classId/open; /start; /complete; /cancel | Updated management detail |

List page/pageSize/courseId/mentorId/status/deliveryMode. Create
`{ courseId, mentorId, code, name, startDate, endDate, maxStudents, deliveryMode,
meetingUrl? }`. Active admin course và active MENTOR pickers đọc hết pagination.
Ngày start/end là YYYY-MM-DD; maxStudents 1–1000; deliveryMode ONLINE/OFFLINE.

DRAFT PATCH nhận name/mentorId/startDate/endDate/maxStudents/deliveryMode/meetingUrl.
OPEN/IN_PROGRESS PATCH chỉ name/mentorId/meetingUrl; null để xóa meeting URL.
Không gửi courseId/code/status. COMPLETED/CANCELLED chỉ đọc.
Lifecycle DRAFT→OPEN→IN_PROGRESS→COMPLETED; cancel chỉ từ trạng thái chưa kết thúc.
Open cần unit và ít nhất một session SCHEDULED; lịch nằm trong thời gian lớp,
mentor không trùng lịch. Backend là nguồn quyết định cuối cùng; 409 refetch detail,
giữ form để user sửa, không tự retry mutation.

Session `{ classUnitId, title, startsAt, endsAt, roomName?, meetingUrl? }`;
classUnitId lấy **class detail**, không dùng courseUnitId. Datetime input ở múi giờ
Asia/Ho_Chi_Minh và gửi ISO offset +07:00. Không đổi ngày date-only qua UTC.
Kiểm tra end>start, trong period và overlap trước request; backend vẫn kiểm tra
mentor conflict/period/lifecycle. Chưa có session edit/delete.

Management detail có status/meetingUrl/createdAt/updatedAt; units có
courseUnitId/status/unlockAt và sessions có classUnitId/meetingUrl. Public schema
tách riêng, bỏ meeting URL/audit/private lifecycle fields. Public product pages
đọc schema public riêng; UI chỉ hiện state thực tế của API, không giả progress.

Routes: /management/classes, /new, /[classId]?unitId=UUID. Form edit thu gọn mặc
định; lịch/unit workspace bên dưới. **Cancel class chưa tự giải phóng pending
seat holds**; cần đợi order expiry theo backend hiện tại, đã ghi trong UI xác nhận.

## Public catalog và syllabus — Prompt 5

| Method | Path | Response |
| --- | --- | --- |
| GET | /courses | Page active courses |
| GET | /courses/:courseId | Public course detail + units + first openClasses |
| GET | /courses/:courseId/classes | Page public open classes |
| GET | /classes/:classId | Public class detail with units/sessions |

Course list query `page,pageSize,categoryId,deliveryMode,startsFrom,startsTo`;
course classes query bỏ `categoryId`. Date filters là ngày bắt đầu lớp, định dạng
YYYY-MM-DD; deliveryMode ONLINE/OFFLINE. Không có search, level hay price sort.
Course item có id/code/title/description nullable/priceAmount/category{id,name,slug}.
Detail thêm units theo thứ tự BE và openClasses nhóm đầu; pagination classes dùng
endpoint riêng. Class có courseId/code/name/startDate/endDate/deliveryMode/maxStudents,
availableSeats và mentor{id,displayName nullable}; giá đọc từ course, server tính
lại khi checkout. Public sessions chỉ id/sessionNumber/title/startsAt/endsAt/
roomName nullable/status; không chứa meeting URL hoặc audit/private lifecycle fields.

Routes `/courses`, `/courses/[courseId]`, `/classes/[classId]` và
`/courses/[courseId]/units/[unitId]`. Unit viewer GET course detail rồi kiểm tra unit
thuộc units[]; render title/description và empty/unavailable state, không gọi API
learning hoặc thêm video/quiz/progress giả. Selection bằng URL, desktop hai vùng
scroll độc lập, mobile native drawer.

## Student cart — Prompt 6

| Method | Path | Response |
| --- | --- | --- |
| GET | /me/cart | `{items,totalAmount}` |
| POST | /me/cart/items | Cart, body chỉ `{classId}` |
| DELETE | /me/cart/items/:classId | 204 |

STUDENT only, backend lấy owner từ session. Mỗi class quantity 1, tối đa 20 items.
Item có classId/classCode/className/courseId/courseTitle/deliveryMode/startDate/
endDate/priceSnapshot/currentPriceAmount/isPurchasable/addedAt. `isPurchasable`
không thay kiểm tra capacity/own enrollment khi checkout; server vẫn quyết định.
Giá snapshot lúc add để so sánh; tổng hiển thị từ cart DTO, checkout lấy giá hiện tại.
Refetch sau mutation hoặc conflict/unknown result; không tự retry lỗi mạng.
Private data không persist browser storage và bị loại khi session/user thay đổi.

## Checkout và own orders — Prompt 7

| Method | Path | Response |
| --- | --- | --- |
| POST | /me/cart/checkout | 201 `{orders:[Order]}`, body chỉ `{paymentType}` |
| GET | /me/orders | Page orders, query page/pageSize/status |
| GET | /me/orders/:orderId | Order, STUDENT owner |

paymentType CASH/PAYOS. CASH tách theo mentor; PAYOS một order cho cả giỏ. Hiển thị
tất cả orders trả về. Order gồm id/orderCode/paymentType/status/totalAmount/expiresAt/
paidAt nullable/mentorId nullable/createdAt/details[]. Detail snapshot có id/classId/
courseTitle/className/priceAmount/quantity(1)/totalAmount. List statuses PENDING,
PAID, EXPIRED, CANCELLED. Không có student cancel endpoint; enum không cho phép FE
tự chuyển trạng thái. Owner denial trả 403 ORDER_ACCESS_DENIED, thiếu trả 404 ORDER_NOT_FOUND.

Checkout chỉ tạo đơn PENDING và giữ chỗ PENDING_PAYMENT. TTL mặc định PAYOS 15 phút,
CASH 48 giờ; job server đổi EXPIRED và nhả enrollment. Countdown chỉ tham khảo,
UI đọc server khi đến deadline; không suy ra PAID/ACTIVE hay tự đổi EXPIRED.
Timeout/response không xác định phải đọc own orders và cart trước khi cho retry
có chủ đích; không replay checkout do lỗi mạng. Backend transaction xóa giỏ khi
checkout thành công. Order cash chỉ có mentorId; không gọi admin users để lấy tên.
Chưa có payment link/QR/cash confirmation; UI nói rõ chưa hoàn tất thanh toán.

## Adapter, lỗi và phạm vi còn lại

Allowlist exact method/path cho identity, catalog/classes public/admin và student
cart/orders; PUT chỉ reorder, DELETE chỉ remove cart item UUID. Google có static
routes riêng. Payment và API học chưa có controller vẫn bị từ chối.
Mutation bắt buộc Origin=APP_ORIGIN,
JSON body ≤32 KiB, timeout 10s, no-store/Vary Cookie, không forward cookie tracking.
Backend error `{ statusCode, code, message: string|string[], details?, requestId? }`.
Validation422 thường code HTTP_ERROR; không giả VALIDATION_FAILED. Phân biệt
401/403/404/409/422, lỗi response schema và network timeout; không log secrets.

Prompt 5–7 nối API hiện có; Prompt 8 ghi riêng quality/mock QA, local live smoke
và phần chưa xác minh tại [full audit](./implement_phase/FULL_AUDIT_2026_10_04.md).
Backend checkout hiện chỉ tạo PENDING/PENDING_PAYMENT, chưa có payment/ACTIVE
learning APIs. Không đánh dấu toàn Phase2 complete. Không sửa nghiệp vụ/migration
BE hoặc chạy destructive integration suite trên application DB. Xem
[bảng API backend](../../Mindy-BE/docs/FRONTEND_API_PAGE_MAP.md).

## Local compiler test module

- Frontend page: `/compiler`, linked from the homepage, no session needed during the compiler testing phase, including production.
- Browser POST `/api/v1/compiler/run` → separate runner POST `/api/code/run`.
- `COMPILER_API_URL` defaults to `http://127.0.0.1:4000`; this is the runner origin, independent of `API_BASE_URL`.
- Input: `{ code: string, stdin?: string }`, code ≤64 KiB UTF-8, stdin ≤32 KiB, JSON body ≤128 KiB.
- Result: `{ ok, status, stdout?, stderr?, exitCode?, durationMs?, truncated?, error?, errors? }`.
- Status: success, user_error, timeout, output_limit, infrastructure_error, busy, rejected.
- Adapter validates both boundaries, verifies Origin, allows anonymous compiler testing, does not forward auth cookies to the runner, and limits upstream waiting to 20 seconds.
- The companion runner in `../../test/apps/api` owns Docker execution; JavaScript is never evaluated inside Next.js.

Start Docker Desktop, then start only the runner API (the companion web app uses the same port as Mindy):

```sh
cd "/Users/FPTU/Ki 8/WDP/test"
docker pull node:22-alpine
npm run build --workspace @js-runner/api
npm run start --workspace @js-runner/api
```

Run Mindy with `pnpm dev` in `mindy-fe` and open `http://localhost:3002/compiler`.
