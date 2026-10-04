# 8 prompt triển khai frontend theo backend hiện có

Ngày bàn giao: 2026-10-02. Dùng cho các chat session mới, chạy lần lượt 1 → 8.
Mỗi code block bên dưới là một prompt có thể copy nguyên khối vào chat mới.
Chat phải đọc tài liệu này để lấy context chung và yêu cầu course unit, không cần
history của chat đã lập kế hoạch. Trạng thái triển khai và bằng chứng nằm ở checklist
cuối file; yêu cầu dưới đây vẫn là nguồn nghiệm thu cho mỗi prompt.

## Context chung bắt buộc cho cả 8 prompt

- Project thực hiện: `mindy-fe`; backend sibling `../Mindy-BE`.
- BE baseline: `feat(api)/booking-sprint`, `577af2f`. Kiểm tra branch/HEAD trước khi
  code; nếu revision đổi, đối chiếu source mới và ghi contract drift. Không tự merge
  hoặc đổi nhánh có local changes để khớp một hash cũ.
- Đọc `AGENTS.md`, `docs/architecture.md`, `docs/api-contracts.md`,
  `docs/progress.md`, tài liệu này và
  [bảng API/trang FE](../../../Mindy-BE/docs/FRONTEND_API_PAGE_MAP.md).
  Tiến độ BE ở [PHASE_2_PROGRESS.md](../../../Mindy-BE/docs/progress/PHASE_2_PROGRESS.md).
- FE scaffold ban đầu dùng `b500dbf`; integration hiện đối chiếu `577af2f`, trong
  khi một số docs phase còn snapshot lịch sử `608ff54`. Controller/DTO/guard/service tại BE checkout thực tế quyết định API;
  không dùng assumptions cũ về MANAGER hoặc thiếu admin read endpoints.
- BE hiện có identity, category/course/units, classes/sessions/lifecycle, public
  browse, cart, checkout, orders, pending enrollment và expiry. Checkout mới tạo
  order PENDING, chưa có payment/ACTIVE learning. API prefix `/api/v1`.
- Roles chỉ ADMIN/MENTOR/STUDENT; mọi management API yêu cầu ADMIN. User status
  có PENDING_VERIFICATION/ACTIVE/SUSPENDED. Admin create password 12–128; register
  password 6–128. Session qua HttpOnly cookies, không lưu token vào browser storage.
- Dùng Ocean Editorial (xanh biển/trắng) đã chọn. UI Lab dùng fixtures; chuyển
  component phù hợp sang product features và nối API thật, không coi preview là
  production. Course unit có bố cục riêng bắt buộc tại mục tiếp theo.
- Giữ `app -> features -> shared`, public feature entries và TypeScript strict.
  Feature mới cần auth/client phải chốt dependency và cập nhật boundary policy
  trước khi sử dụng. Không mở import tùy ý hoặc tạo placeholder chưa có consumer.
- Browser gọi same-origin adapter; allowlist method/path chính xác, kiểm tra Origin
  mutation, giữ no-store cho dữ liệu cá nhân và runtime response schemas.
- Làm tiếp code đã có; giữ staged/unstaged/untracked changes khác. Không tự push,
  merge/deploy hoặc sửa nghiệp vụ/migration BE để hoàn tất FE.
- Mỗi prompt cập nhật progress, contracts/architecture khi cần; ghi route/API,
  kiểm tra đã chạy, kết quả và blocker. Kiểm thử phù hợp rủi ro; mock E2E và live
  smoke phải ghi riêng. Không đánh dấu live pass khi chỉ dùng mock.
- Runtime pinned là Node 22.20.0/pnpm 12.6.0; đã khôi phục executable trong cache
  khi triển khai. Kiểm tra lại môi trường và báo chính xác nếu check chưa chạy.

## Yêu cầu course unit: rail trái cuộn độc lập, nội dung bên phải

Đây là yêu cầu trực tiếp của user, tham chiếu ảnh Coursera được lưu trong repo:
[course-unit-coursera.png](../ui-exploration/references/course-unit-coursera.png).
Xem ảnh bằng công cụ xem ảnh trước khi triển khai. Ảnh chỉ tham chiếu bố cục,
không phải yêu cầu thêm các tính năng lab/quiz/progress chưa có API.

![Tham chiếu bố cục course unit Coursera](../ui-exploration/references/course-unit-coursera.png)

### Bố cục và tương tác bắt buộc

- Desktop là workspace hai cột dưới header: rail trái khoảng 280–320px, phần
  nội dung bên phải chiếm diện tích còn lại. Giữ brand/tokens Mindy.
- Rail trái có tên course/back navigation và danh sách units theo đúng thứ tự BE;
  mục đang chọn được highlight rõ. Nhóm/session chỉ xuất hiện khi DTO của màn hình
  đó có dữ liệu tương ứng; có thể collapse/expand nếu cần.
- **Rail trái có thanh cuộn dọc riêng** khi danh sách dài. Giới hạn chiều cao theo
  viewport dưới header; không để cả trang dài lên chỉ vì rail dài.
- Panel phải hiển thị title và nội dung/description hoặc form của unit đang chọn.
  Cuộn nội dung phải không làm mất rail; dùng vùng scroll riêng cho content dài.
  Thiết kế grid/flex có `min-height: 0`, `min-width: 0` để tránh overflow.
- Chọn unit đổi nội dung panel phải và cập nhật URL để reload/deep link giữ đúng
  unit. Hỗ trợ back/forward; unitId không thuộc course phải hiện unavailable.
- Mobile chuyển rail thành drawer hoặc panel collapse có nút “Nội dung khóa học”;
  vẫn chọn được units và đọc nội dung. Drawer cần Escape, focus management và
  return focus; không để hai cột chen nhau hoặc có horizontal overflow.
- Selection/expand/collapse dùng control có semantics và keyboard; selected item
  có accessible state, focus rõ. Phân biệt selected với completed/locked.
- Chỉ hiển thị completed/progress/locked khi có state từ API thích hợp. Không vẽ
  checkmark hoàn thành, daily goals, thời lượng video hoặc CTA launch lab giả.

### Màn hình áp dụng và giới hạn dữ liệu

1. **Admin course units — prompt 3:** `/management/courses/[courseId]` có workspace
   quản trị units: selector/reorder bên trái, chi tiết/form thêm unit bên phải.
   Course fields/activation có thể ở tab khác trên cùng route. Unit hiện chỉ có
   add/reorder/read; không tạo editor save/delete cho API chưa có.
2. **Public course unit — prompt 5:** tạo route
   `/courses/[courseId]/units/[unitId]`, lấy GET `/courses/:courseId`, tìm unit trong
   `units[]`, render title/description và thông tin public có thật. Syllabus trên
   course detail dẫn tới route này. Đây là page đọc syllabus public, không phải
   trang học private được mở quyền sau checkout.
3. **Class detail — prompts 4/5:** có thể tái sử dụng bố cục khi xem units/sessions,
   phân biệt DTO public và management; meeting URL chỉ xuất hiện theo quyền BE.
4. **Learning sau này:** áp dụng cùng layout cho own ACTIVE content khi BE có read
   APIs. Chưa xây API giả hoặc coi course public description là nội dung học riêng.

Không bắt buộc clone toàn bộ UI Coursera hoặc cài UI library mới. Tạo abstraction
khi có consumer thực tế; có thể dùng bố cục tương đồng trong từng feature để giữ
boundaries. Không dùng import private giữa catalog/classes.

### Tiêu chí nghiệm thu course unit

- Danh sách nhiều units: cuộn rail vẫn thấy nội dung phải; nội dung phải dài:
  cuộn phải không kéo mất rail. Unit đang chọn có thể được đưa vào vùng nhìn thấy.
- URL/deep link/reload/back-forward chọn đúng unit; xử lý invalid course/unit.
- Empty description có trạng thái phù hợp, không chèn nội dung giả.
- Kiểm tra ở 1440px, 768px và 390px: không tràn ngang, drawer dùng được bằng keyboard.
- Giữ ảnh tham chiếu trong repo để session sau vẫn xem được, không dựa vào file temp.

## Prompt 1 — Đồng bộ nền tảng và identity contract

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md và áp dụng Context chung.
Thực hiện Prompt 1, kiểm tra progress để tiếp tục phần chưa hoàn tất.

Đồng bộ FE với BE hiện tại: bỏ MANAGER khỏi schema/form/labels/permissions;
management chỉ ADMIN. Thêm PENDING_VERIFICATION vào response, filter và label.
Sửa admin create-user password thành 12–128, public register giữ 6–128.
Rà /login, /register, /verify-email, /account và management users list/new/detail.
Đồng bộ docs về API revision, permissions và validators; không giữ ghi chú
Swagger mismatch cũ khi DTO hiện tại đã khớp. Kiểm tra 401/403/422 và session.

Chưa triển khai Phase 2 trong prompt này. Chạy check phù hợp, cập nhật progress
và bàn giao thay đổi/blocker rõ ràng để chat tiếp theo làm Prompt 2.
```

## Prompt 2 — Google authentication và onboarding

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md và áp dụng Context chung.
Thực hiện Prompt 2 sau khi xác nhận Prompt 1 đủ nền tảng identity.

Thêm Google sign-in cho /login và /register, cùng trang /register/complete.
Nối GET /auth/google, GET /auth/google/callback, GET /auth/registration-context
và POST /auth/google/complete-registration đúng controller/DTO backend.
Thiết kế adapter navigation/callback kiểm tra redirect tin cậy, forwarding
google_oauth_state và registration_intent đúng path; generic proxy hiện chặn 302.
Form context prefill tên/avatar, email chỉ đọc; complete payload chỉ có
displayName, phone tùy chọn và deviceName tùy chọn.
Xử lý intent hết hạn, Google disabled/callback lỗi, existing user và session
sau onboarding. Đối chiếu frontend origin, GOOGLE_REGISTRATION_PATH và OAuth
redirect URI; không lưu provider tokens vào browser storage.

Kiểm tra adapter/cookies/redirects và UX, ghi riêng mock versus live Google.
Cập nhật progress/config instructions để chat mới tiếp tục Prompt 3.
```

## Prompt 3 — Quản trị category, course và course units

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md, áp dụng Context chung
và xem ảnh tham chiếu trong mục yêu cầu course unit. Thực hiện Prompt 3.

Triển khai cho ADMIN: /management/course-categories, /management/courses,
/management/courses/new và /management/courses/[courseId]. Category creation
có thể dùng dialog nhưng phải có navigation/consumer thực tế.
Nối GET /course-categories, POST /admin/course-categories, admin course
list/detail/create/update, POST units, PUT units/order và POST activate.
Chuẩn bị pagination/filter, schemas/forms, loading/empty/error/conflict.
Course tạo inactive; edit fields và activate theo command BE riêng.

Course units bắt buộc rail trái cuộn độc lập, unit selection/reorder bên trái,
chi tiết/form ở panel phải như ảnh Coursera; URL giữ selection. Chỉ add/reorder/read
vì chưa có API edit/delete unit. Không giả lập save description hoặc progress.
Thêm PUT allowlist đúng path và auth dependency có chủ đích.

Kiểm tra permission, contract, reorder và hai vùng scroll/mobile/keyboard.
Cập nhật progress và docs, ghi rõ phần đã có để Prompt 4 dùng tiếp.
```

## Prompt 4 — Quản trị lớp và lịch học

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md và áp dụng Context chung.
Thực hiện Prompt 4, dùng catalog của Prompt 3 sau khi kiểm tra trạng thái thực tế.

Triển khai /management/classes, /management/classes/new và
/management/classes/[classId] cho ADMIN. Nối class list/detail/create/update,
POST sessions và các POST open/start/complete/cancel.
Course picker dùng admin courses active; mentor picker dùng admin users
role=MENTOR/status=ACTIVE, đọc đủ pagination. Lifecycle và editable fields
theo BE, không patch status tùy ý hoặc thêm session edit/delete chưa có API.
Session gửi classUnitId từ class detail; date-only giữ đúng ngày và datetime
có timezone offset. Xử lý invalid period, schedule overlap, mentor conflict,
not-ready-to-open và 409 bằng refetch.
Vùng units/sessions cần selector cuộn bên trái, chi tiết/lịch/form bên phải
theo quy tắc layout course unit, public/private fields tách đúng contract.

Kiểm tra guards/forms/lifecycle, responsive/keyboard; cập nhật progress.
Ghi rõ giới hạn hiện tại: cancel class chưa tự giải phóng pending seat holds.
```

## Prompt 5 — Public catalog, class detail và course unit viewer

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md, áp dụng Context chung
và xem ảnh tham chiếu course unit. Thực hiện Prompt 5 bằng API thật.

Triển khai /courses, /courses/[courseId], /classes/[classId] và
/courses/[courseId]/units/[unitId] theo Ocean Editorial.
Nối categories/course list/course detail/course classes/class detail.
Pagination và URL filters đúng DTO: categoryId, deliveryMode, startsFrom/startsTo;
không gửi search/level/price-sort query chưa có API. Giá class đọc từ course.
Hiển thị mentor, timetable, availableSeats và syllabus từ DTO public.

Course unit viewer bắt buộc rail trái khoảng 280–320px cuộn độc lập và nội dung
unit đang chọn bên phải như ảnh. GET course detail cung cấp units; validate unit
thuộc course, dùng title/description thật. Links syllabus dẫn tới route unit,
reload/back-forward giữ selection; mobile dùng drawer/collapse, keyboard đầy đủ.
Chưa có learning content/progress API: không giả video/quiz/completion/launch lab.

Nối add-to-cart cho STUDENT với { classId }, xử lý login/safeReturnTo, role,
duplicate/full/unavailable; dùng client có consumer thật và để Prompt 6 mở rộng.
Kiểm tra API/UX/deep links/two-pane scroll, cập nhật docs/progress.
```

## Prompt 6 — Giỏ hàng thật

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md và áp dụng Context chung.
Thực hiện Prompt 6 sau khi kiểm tra catalog/add-to-cart ở Prompt 5.

Triển khai product /cart, nối GET /me/cart, POST /me/cart/items và
DELETE /me/cart/items/:classId; mở DELETE trong adapter đúng method/path.
Cart items là class, quantity 1, add body chỉ { classId }, giới hạn 20 items.
Hiển thị giá snapshot/giá hiện tại, isPurchasable, tên course/class, mode/ngày,
tổng tiền và thao tác bỏ lớp. Refetch sau mutation, feedback errors từ BE.
Cart API là nguồn dữ liệu chính; không dùng sessionStorage preview cart/fixture IDs.
Private state dọn khi logout/đổi account; xử lý loading/empty/error/mobile/keyboard.
Chuẩn bị CTA /checkout và safeReturnTo hợp lệ, không tự retry mutation timeout.

Kiểm tra contract/adapter/add-remove UX và cập nhật progress cho Prompt 7.
```

## Prompt 7 — Checkout và orders

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md và áp dụng Context chung.
Thực hiện Prompt 7 trên cart thật của Prompt 6.

Triển khai /checkout, /orders và /orders/[orderId] cho STUDENT owner.
Nối GET cart, POST /me/cart/checkout, GET /me/orders và GET order detail.
Checkout chỉ gửi { paymentType: CASH hoặc PAYOS }, response luôn { orders: [...] }.
PAYOS một order cho cả cart; CASH tách theo mentor. Hiển thị tất cả orders,
không chỉ redirect orders[0]. Snapshot/details/total/deadline từ server.
Orders list filter status và pagination; detail có pending/expired feedback.
Chống double-submit; timeout đọc lại orders/cart trước khi retry. Cart được xóa
sau checkout thành công; không dùng browser state để kết luận status.
Countdown chỉ tham khảo, lấy status BE; không tự chuyển PAID/enrollment ACTIVE.
Backend chưa có payment link/QR/cash confirmation: UI phải nói rõ đây là bước
tạo đơn/giữ chỗ, chưa hoàn tất thanh toán. Không thêm cancel-order API giả.
Mentor order chỉ có mentorId; student không gọi admin users để lấy thông tin.

Kiểm tra ownership, multi-order, unknown-result recovery, cleanup và expiry.
Cập nhật progress, contracts/return paths và bàn giao cho Prompt 8.
```

## Prompt 8 — QA và smoke tích hợp

```text
Đọc docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md và áp dụng Context chung.
Rà tiến độ Prompt 1–7; thực hiện Prompt 8, sửa các lỗi FE còn lại trong phạm vi này.

Chạy quality checks và E2E phù hợp. Smoke FE → BE thật trên development/test
nếu có môi trường: ADMIN tạo category/course/units/activate, tạo class/session/open;
STUDENT browse/course-unit viewer, add/remove cart, checkout và own orders.
Kiểm tra roles/ownership/deep link, conflicts, expiry, timeout recovery và logout.
Course units nghiệm thu rail trái và nội dung phải cuộn độc lập; selection/reload/
back-forward, invalid unit, description rỗng, drawer/keyboard ở 1440/768/390px.
Google/email chỉ ghi live pass khi có cấu hình và thực sự chạy; nếu thiếu thì ghi
blocker cụ thể, hoàn tất các check độc lập. Phân biệt mock E2E với live smoke.
Không seed/reset DB đang dùng hoặc chạy suite xóa dữ liệu trên application DB;
integration destructive chỉ dùng dedicated DB _test theo BE instructions.

Cập nhật API/architecture/progress bằng evidence đã chạy, phần chưa xác minh,
route coverage và backlog BE: PayOS/cash payment, preview, ACTIVE content/progress,
reconciliation. Không đánh dấu toàn Phase 2 complete khi payment/learning chưa có.
Không tự push/merge/deploy.
```

## Theo dõi bàn giao giữa các chat

Prompt1–4 đã triển khai; [bằng chứng77unit/22E2E và giới hạnlive](./IMPLEMENTATION_PROMPTS_1_4.md).
Prompt5–8 đã triển khai; [109 unit / 43 mock E2E, visual QA và live blockers](./IMPLEMENTATION_PROMPTS_5_8.md).
Audit ngày 2026-10-04: [121 unit / 49 mock E2E, 12 bước live local và giới hạn provider](./FULL_AUDIT_2026_10_04.md).

Cập nhật checklist chỉ khi có bằng chứng; detailed evidence ghi trong progress.

- [x] Prompt 1: identity contract và permissions.
- [x] Prompt 2: Google onboarding + trạng thái live verification (mock pass; live chưa xác minh).
- [x] Prompt 3: category/course/units, rail trái và panel phải.
- [x] Prompt 4: class/schedule/lifecycle.
- [x] Prompt 5: public catalog/class + course unit viewer như ảnh.
- [x] Prompt 6: API cart thật.
- [x] Prompt 7: checkout/own orders tới trạng thái pending.
- [x] Prompt 8: quality/UX/mock evidence và live FE/BE/DB/SMTP nội bộ pass; Google provider, SMTP ngoài và staging chưa xác minh.

Prompt sau đọc progress và source trước khi làm, không suy rằng prompt trước đã
hoàn tất chỉ vì số thứ tự. Không cần user tạo chat tự động; user copy prompt hoặc
nhắn “Đọc tài liệu 8 prompt và thực hiện Prompt N”.
