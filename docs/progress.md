# Frontend progress

## Trạng thái hiện tại — 06/10/2026

Typography vùng “Có nhiều cách để bắt đầu”: Nunito giống header, tiêu đề card
30px/800 (27–28px trên màn nhỏ), mô tả và link 16px. Đã xem screenshot desktop/mobile,
không tràn ngang; Biome/build và 4 E2E homepage/theme pass.

Hero homepage: tạo ảnh trời/mây theo palette pastel đã chốt bằng imagegen,
phục vụ bản WebP tại public/mindy/hero-clouds.webp. Nền phủ toàn hero, bỏ blob
phía sau mascot; luminosity blend giữ màu từ config global. Xem ảnh desktop/mobile
tại docs/ui-redesign/screenshots/hero-clouds-1440.png và hero-clouds-390.png.
Build/Biome và 6 E2E homepage/theme/journey pass; không thay đổi API/logic.

Cập nhật theo phản hồi UI: header public toàn chiều rộng, bỏ card bọc bo tròn,
Nunito Variable local đậm 16–17px. Login/đăng ký dùng 100dvh, ẩn intro trên mobile,
form hai cột ở màn hình thấp. Đã kiểm tra không cuộn trang/form mặc định tại tám
kích thước từ 320×568 đến 1440×900, gồm 844×390 xoay ngang; lỗi dài vẫn truy cập
được bằng cuộn cục bộ. Production build/Biome pass, 15 E2E auth/identity/responsive
pass sau thay đổi cuối; 19 E2E homepage/header/identity/journey pass ở lượt trước.

Baseline tích hợp: BE `Feat/Webhooktest` tại `5c9e581`, đã merge vào `dev`.
Các mục bên dưới là trạng thái hiện hành; nhật ký ngày cũ giữ nguyên để truy vết.

Audit source ngày 06/10/2026: BE checkout hiện tại đã lên `01fc1eb`;
FE `460b8d6` chưa nối bốn endpoint mới cho result mapping và CASH.
Xem [API audit và logic flow bàn giao UI mới](./logic-flow.md) để phân biệt
integration hiện có, phần chờ FE và backlog BE.

| Nhóm chức năng | Tiến độ FE |
| --- | --- |
| Tài khoản và users | Đã tích hợp password, đăng ký/xác thực email, Google onboarding, session và quản trị users; Google/provider email thật còn cần xác minh |
| Catalog và lớp | Đã tích hợp category/course/units, class/schedule/lifecycle, public browse và syllabus |
| Ảnh khóa học | Đã tích hợp imgUrl, admin tạo/sửa/xóa và public image fallback |
| Giỏ hàng và checkout | Đã tích hợp giỏ thật, CASH tách theo mentor, PAYOS một đơn, giữ chỗ, expiry và own orders |
| PayOS | Đã tích hợp tạo/reuse link, trạng thái, polling và recovery; mở trang PayOS để thanh toán/hiển thị QR |
| Lớp sau thanh toán | Đã tích hợp private class, units/lịch/phòng/meeting URL và kiểm tra quyền từ BE; chưa có danh sách lớp hoặc progress API |
| Đối soát ADMIN | Đã tích hợp review events, phân trang và reconcile; kết quả phải đọc lại từ BE |
| Giao diện | UI Mindy mới trên Huy/Feat/UIredesign; theme global, logo/docs palette, Geist, mascot/GSAP; nguồn UI cũ đã gỡ |
| Compiler | Playground và runner riêng đã có; chưa gắn với tiến độ/quyền học của lớp |

**Bằng chứng UI mới:** TypeScript, production build, module boundaries và Biome
không formatter pass; 134 unit tests và 71 Chromium scenarios pass. Browser tests
dùng API mô phỏng, responsive 1440/768/390/375 và keyboard/dialog. Lint mặc định
vẫn fail 183 lỗi formatter CRLF/LF trong các file không thuộc thay đổi này.
Các file code/CSS đã sửa đều qua Biome đầy đủ.

Bằng chứng tích hợp BE của đợt trước:
BE payment HTTP E2E 3/3 pass; smoke FE → BFF → BE dùng cookie thật, PostgreSQL
riêng và provider giả đã xác minh signed settlement, PAID/ACTIVE và private access.
Chưa nghiệm thu PayOS/provider email thật hoặc deploy trong đợt tích hợp này.

**Còn chờ FE, BE đã có:** mapping return/cancel cho `/payment/result`, mentor
cash-order list/confirmation và cash pending preview. Cần đồng bộ
`providerOrderCode`, safe return paths cho learning/reconciliation và copy CASH.
**Còn chờ BE:** danh sách enrollment/lớp đã đăng ký và API đọc/cập nhật progress.
Materials, attendance, assignments, chat, notifications và dashboard là các phase sau.
Phase 2 chưa đóng toàn bộ vì các dependency và nghiệm thu live trên vẫn còn mở.

[Chi tiết triển khai và cách kiểm thử](./implement_phase/PHASE_2_2_FRONTEND_INTEGRATION.md).

## 2026-10-06 — Thay toàn bộ UI Mindy, giữ logic

- Thực hiện trên branch có sẵn Huy/Feat/UIredesign. Thay homepage, auth, public
  catalog, student, admin, forms/tables, cart/orders, learning và compiler styles.
  Admin đổi thành sidebar + workspace; không còn cột hồ sơ Learnthru.
- Theme duy nhất tại src/shared/config/theme.ts, palette sky/lavender lấy từ docs.
  Brand và favicon dùng docs/logo.jpg; mascot mới, Geist Sans local, GSAP có
  cleanup và reduced-motion. Ảnh/logo raster giữ nguyên màu.
- Không sửa API/schema/domain/session/permissions, BE hoặc tích hợp bốn API
  mới đang chờ. Homepage dùng adapter GET /courses có sẵn với loading/retry/empty.
- Gỡ source/fixture/assets của UI Lab và Learnthru; URL cũ redirect về /. Giữ
  behavioral tests, thay bài kiểm tra preview cũ bằng redirect và thêm homepage,
  theme propagation, motion và responsive tests.
- 134 unit tests / 24 files và 71 E2E pass. TypeScript/build/boundaries pass.
  Biome trên file sửa và check toàn repo khi tắt formatter pass; default lint
  còn 183 lỗi CRLF/LF kế thừa. Không normalize các file nghiệp vụ ngoài phạm vi.
- Đã xem ảnh desktop/mobile cho home/auth/admin. [Ảnh và hướng dẫn](./ui-redesign/README.md).
  Screenshot lịch sử integration giữ nguyên; ảnh mới nằm trong ui-redesign.
  Preview localhost:3002 trả 200, không có pageerror. Chưa commit/push/deploy.

## 2026-10-06 — API audit và logic flow cho UI rewrite

- Đối chiếu FE `feat/ui-exploration-blue-white` / `460b8d6` với BE
  `Feat/Webhooktest` / `01fc1eb`: 55 endpoint BE, 49 endpoint được FE adapter
  hỗ trợ; 4 endpoint UI mới chưa gắn, 2 endpoint hạ tầng không proxy.
- Thêm [docs/logic-flow.md](./logic-flow.md): route/API/role matrix, auth,
  discovery/cart/checkout/payment/learning/admin flows, contract drift và checklist
  bàn giao branch UI mới. Chưa thay đổi runtime/UI, tạo branch hoặc sửa BE.
- Kiểm chứng: 134 unit tests / 24 files pass, TypeScript và module boundaries pass.
  Lint mặc định fail 242 lỗi formatter CRLF/LF của checkout hiện tại; Biome check
  khi tắt formatter pass. Không normalize source hoặc sửa package-lock untracked.
- Chưa chạy lại production build, browser E2E hoặc live Google/PayOS/SMTP trong
  audit này. Bằng chứng provider/fixture của các đợt trước vẫn là lịch sử riêng.

## 2026-10-06 — Phase 2.2 FE integration with BE 5c9e581

- Updated contract baseline, exact BFF allowlist and feature dependencies. Order
  list/checkout retain Order; own order detail now validates nullable Payment.
- PayOS order detail supports create/reuse with `{}`, new-tab provider checkout,
  CREATING/PENDING/SUCCEEDED/REQUIRES_REVIEW, expiry and provider error feedback.
  Reads are serialized; pending polls every 5 seconds while visible, pauses hidden
  tabs and revalidates on return. Unknown creation requires read recovery before
  deliberate retry on the same order; no checkout replay or redirect-based settlement.
- Added `/learning/classes/[classId]` linked from PAID order details. Student-only
  API reads authorized units/timetable/rooms/private meeting URLs, supports unit
  URL/history and mobile drawer, and handles pending/foreign/cancelled denial.
  Principal-keyed private UI aborts requests and discards late responses on session changes.
- Added nullable course imgUrl to admin/public schemas, create/edit/clear form and
  public cards/detail. Untouched PATCH omits image; clear sends null; failed/null
  image falls back to course artwork. No image upload.
- Added ADMIN `/management/payments/reconciliation`: paginated review events,
  nullable paymentId, serialized provider reconcile and mandatory list refresh.
  Review results never infer resolution, refunds or access grants.
- Preserved existing and concurrently updated Learnthru UI. No backend business,
  migration, deploy, application DB, real provider payment or external SMTP changes.
  Return/cancel mapping, cash confirmation/preview, enrollment list and progress
  endpoints remain deferred.
- Final quality gate: full lint/boundaries, TypeScript and production build pass;
  **134 unit tests / 24 files** and **72 Chromium scenarios** pass. Browser tests
  use mocked APIs, including desktop/mobile/keyboard, lost response/recovery,
  visibility polling, account change during mutation, image create/edit/clear/fallback
  and ADMIN/student/mentor permissions.
- Separate payment evidence: BE **3 HTTP E2E pass**; FE BFF smoke passed with real
  cookies/guards, signed settlement, PAID/ACTIVE private access, ownership denial
  and ADMIN reconciliation using BE fixture/fake provider and disposable PostgreSQL
  16 on port 5544. BE dependencies installed frozen; BE source remains clean.
  Container `mindy-fe-phase22-audit` was removed after checks. No manual/VPS DB used.
- [Implementation/evidence and repeatable smoke](./implement_phase/PHASE_2_2_FRONTEND_INTEGRATION.md).

## 2026-10-06 — Learnthru rollout across remaining product pages

- Applied shared pastel tokens, rounded white panels, pill actions, soft fields,
  readable action colors and consistent table/dialog/error states.
- Migrated auth, public catalog/course/class/unit, compiler, account, cart,
  checkout/orders and every admin page. Student learning and payment reconciliation
  inherit shared styles; their business features remain separate work.
- Preserved public/student horizontal navigation, auth form layout and homepage
  landing structure. Only ADMIN uses LearnthruAdminShell across protected routes.
- UnitWorkspace switches to its accessible rail dialog based on available width
  as well as viewport, keeping independent scrolling and URL selection.
- Preserved session, role guards, APIs and business interactions; updated stale
  image fixtures and a homepage link assertion without changing API logic.
- Validation: lint/boundaries, TypeScript, production build and 121 unit tests pass.
  All 53 Chromium E2E tests pass on an isolated production build, including route
  coverage at 1440/768/390/375px, no overflow/page errors, navigation/focus and
  compact workspace resizing. Desktop/mobile screenshots visually reviewed.
  Final spacing/learning-navigation refinements passed all four responsive UI
  tests and seven checkout tests again; all 16 payment/learning tests also pass.
  Browser tests use mocked APIs; no live backend or deployment verification.

## 2026-10-05 — Clarified homepage landing layout

- Replaced dashboard columns with a horizontal public header, spacious two-column
  hero, stacked discovery/journey/practice sections, registration CTA and footer.
- Retained Learnthru palette, rounded cards, pill buttons, icons, typography family
  and finite animations, with layout and scale suited to a public landing page.
- Removed public sidebar/profile rail; preserved routes, mobile native menu and
  health disclosure in footer. UI.md now distinguishes homepage from admin layout.
- Validation: changed-file Biome and module boundaries, TypeScript and production
  build pass; Chromium verified 1440/768/390/375px without overflow, mobile menu,
  Escape/focus return, section navigation, registration CTA and reduced motion.
  Desktop/mobile screenshots reviewed; no browser page errors.

## 2026-10-05 — Homepage aligned with current Learnthru admin design

- Migrated `/` from Ocean Editorial to the Learnthru direction documented in UI.md
  and implemented by `/management/users`: white sidebar, gray workspace, right
  introductory panel, rounded welcome card, pastel blue/lavender/pink shortcuts.
- Retained public courses/compiler/register/login routes, registration guide,
  illustrative JavaScript example and health disclosure. No fixture user profile,
  progress, statistics or calendar; no API or global theme changes.
- Added native mobile navigation dialog with Escape and focus return; retained
  finite entrance/hover animation with reduced-motion support.
- Validation: changed-file Biome, module boundaries, TypeScript and production
  build pass. Chromium verified 1440/768/390/375px without horizontal overflow,
  mobile drawer open/close, Escape/focus return, section anchor, registration CTA,
  reduced motion and no page errors. Desktop/mobile screenshots visually reviewed.


## 2026-10-05 — Homepage Ocean Editorial refresh

- Expanded the public homepage with a learning-notes hero illustration, discovery links,
  three-step registration guide, JavaScript practice introduction and registration CTA.
- Added finite entrance animations, progressive CSS scroll reveals and hover details;
  prefers-reduced-motion disables motion. Content is server-rendered; no new dependency.
- Kept real catalog/compiler/auth routes and moved the existing health check into a
  footer disclosure. Decorative learning notes and code output are illustrations,
  not student progress, testimonials or live execution results.
- Validation: changed-file Biome and module boundaries pass, TypeScript and production
  build pass, all 121 unit tests pass. Chromium checked 1440/768/390/375px without
  horizontal overflow, registration CTA, section anchor, reduced motion and no page errors;
  desktop/mobile screenshots visually inspected.
- Full-project lint is blocked by three errors in the separate learnthru dashboard
  (autoFocus and two array-index keys); those files were not changed for this request.


## 2026-10-04 — Môi trường local để kiểm tra tay

- Theo yêu cầu người dùng, FE `.env.local` trỏ tới
  `http://127.0.0.1:3198/api/v1`, `APP_ORIGIN=http://localhost:3002`.
- Backend chạy lâu dài từ checkout riêng `../Mindy-BE-local`, revision `577af2f`
  của `feat(api)/booking-sprint`; checkout BE hiện có vẫn ở `main`, không merge/đổi nhánh.
- PostgreSQL riêng `mindy_manual_local` ở cổng 5433 dùng persistent Docker volume;
  đã chạy tám migrations và seed admin, hai mentors, ba students, sáu courses/bảy classes.
- Mailpit ở `http://localhost:8025` nhận email xác thực local; Google chưa bật vì
  chưa có OAuth credentials. Checkout vẫn chỉ tới pending order/seat hold.
- Đã kiểm tra health qua FE và BE trả 200; login ADMIN/STUDENT bằng trình duyệt
  thật thành công, admin catalog/public courses hiển thị dữ liệu seed và student
  đọc giỏ hàng được. Không mock request trong kiểm tra cấu hình local này.
- Giữ backend/PostgreSQL/Mailpit chạy để người dùng kiểm tra tay; cấu hình cũ của
  FE được lưu trong `../.local-runtime/fe.env.local.before-local`.
- Hướng dẫn restart, log và tài khoản local tại
  [local runtime README](../../.local-runtime/README.md). Không commit local env/JWT keys.

## 2026-10-04 — Kiểm kê chức năng FE và rà soát tích hợp toàn bộ

Đã đối chiếu source FE với `PROMPTS_BACKEND_INTEGRATION.md`, `ui-rules.md` và
backend `feat(api)/booking-sprint` tại `577af2f`. Các phần dưới đây là giao diện
sản phẩm có client nối API hiện có; UI Lab là preview riêng dùng fixture.

| Phần | Chức năng đã triển khai | Route chính |
| --- | --- | --- |
| Nền tảng | Next.js App Router, TypeScript strict, Zod/RHF, module boundaries; adapter cùng origin, allowlist, kiểm tra Origin, no-store và timeout | `/api/v1/*` |
| Tài khoản | Đăng nhập, đăng ký STUDENT, xác thực/gửi lại email, xem tài khoản, refresh, logout; phân quyền ADMIN/MENTOR/STUDENT | `/login`, `/register`, `/verify-email`, `/account` |
| Google | Bắt đầu OAuth, callback, đọc registration intent, hoàn tất hồ sơ; email chỉ đọc | `/login/google/callback`, `/register/complete` |
| Quản trị users | Danh sách, lọc role/status, phân trang, tạo user, xem chi tiết, khóa/kích hoạt | `/management/users`, `/management/users/new`, `/management/users/[userId]` |
| Quản trị khóa học | Tạo category/course, sửa thông tin, thêm/đọc/sắp xếp units, activate course | `/management/course-categories`, `/management/courses/*` |
| Quản trị lớp | Danh sách/lọc/chi tiết, tạo/sửa lớp, chọn course/mentor đang hoạt động, xếp lịch, open/start/complete/cancel | `/management/classes/*` |
| Catalog công khai | Danh sách/lọc/phân trang khóa học, chi tiết course/class, mentor, lịch, học phí và chỗ trống từ BE | `/courses`, `/courses/[courseId]`, `/classes/[classId]` |
| Xem học phần | Rail trái khoảng 300px và nội dung cuộn độc lập; URL/deep link/history, kiểm tra unit membership, drawer trên mobile | `/courses/[courseId]/units/[unitId]`; workspace course/class |
| Giỏ hàng | STUDENT đọc/thêm/xóa lớp, quantity 1, tối đa 20; giá snapshot/current, total và availability từ BE, đọc lại sau mutation | `/cart` |
| Checkout và orders | CASH/PAYOS, tất cả receipts khi CASH tách theo mentor, chặn submit trùng, khôi phục kết quả chưa rõ, own orders/filter/detail và status từ BE | `/checkout`, `/orders`, `/orders/[orderId]` |
| Giao diện | Ocean Editorial cho các luồng sản phẩm, menu/dialog responsive, keyboard/focus, loading/empty/error/retry | Các route trên |
| Compiler | Trang compiler và adapter nối runner độc lập; chưa gắn với quyền học của course | `/compiler` |

**Phạm vi hoàn tất:** chức năng FE của Prompts 1–7 đã được triển khai; Prompt 8
kiểm tra chất lượng, giao diện và tích hợp theo bằng chứng riêng bên dưới. Điều này
không đồng nghĩa toàn Phase 2 đã hoàn tất.

### Kết quả xác minh

| Kiểm tra | Kết quả và phạm vi |
| --- | --- |
| FE `pnpm check` | Pass: Biome/module boundaries, TypeScript, **121 unit tests / 22 files**, production build |
| FE `pnpm test:e2e` | **49 Chromium scenarios pass**, dùng API mô phỏng; gồm toàn bộ regression auth, quản trị, public catalog, cart, orders và UI Lab |
| BE `pnpm check` với test DB | Pass: lint, TypeScript, **29 unit + 35 PostgreSQL integration tests**, production build |
| Live FE → BFF → BE | **12 bước pass**, không mock: đăng ký/xác thực email qua SMTP nội bộ, refresh, catalog, cart, CASH/PAYOS pending orders, ownership 403, expiry thật/nhả chỗ và logout |
| Responsive/keyboard | 1440/768/390/375px, không tràn ngang; rail/content cuộn độc lập, drawer/Escape/focus return; **27 ảnh live local** |

Live admin tạo dữ liệu bằng BFF API và kiểm tra trang đọc course/class; các form
CRUD admin được kiểm bằng E2E mô phỏng. Email được Nodemailer gửi đến bộ nhận SMTP
nội bộ, không phải nhà cung cấp email ngoài. Compiler được kiểm bằng unit/mock
regression trong lượt này, chưa smoke runner live.

Lượt rà soát cũng sửa: mutation/logout dừng khi principal khác account đang hiển
thị; Google callback cấp cookies dưới WebLock, intent mới được ưu tiên khi còn
session cũ và feedback lỗi Google không bị redirect che mất; form tạo lớp giữ
draft qua refresh/loading/empty/error và mentor 422; ô chọn giữ giá trị khi options
thay đổi; giỏ hàng bỏ giá cũ/CTA checkout nếu không tải lại được dữ liệu. Các hành vi
này có regression tests. Backend chỉ sửa định dạng `RegisterDto` để quality gate
qua, không đổi nghiệp vụ hoặc migrations.

Kiểm thử dùng Node 22.20.0/pnpm 12.6.0, PostgreSQL 16 trong container tạm và database
riêng `mindy_audit_test`. Không dùng/reset database ứng dụng. Không commit, push,
merge hoặc deploy. Các dịch vụ và database test tạm đã được dọn sau kiểm thử.
[Báo cáo audit và cách chạy smoke](./implement_phase/FULL_AUDIT_2026_10_04.md)
ghi rõ phạm vi và các phần chưa xác minh. Các mục ngày 2026-10-02 bên dưới là nhật ký
lịch sử; blocker và số test cũ không thay thế kết quả hiện tại.

**Phần còn thiếu:** checkout mới tạo `PENDING` orders và `PENDING_PAYMENT` seat
holds. Backend chưa có PayOS link/QR/webhook, xác nhận tiền mặt, reconciliation,
pending preview hoặc quyền học/content/progress cho ACTIVE enrollment. Google
OAuth với tài khoản provider thật chưa xác minh. Chưa có API sửa/xóa unit hoặc
session; cancel class chưa tự nhả pending holds. MENTOR hiện có browse/account,
chưa dashboard, attendance hoặc xác nhận thu tiền. UI Lab cart dùng fixture và
sessionStorage riêng; product cart không sử dụng dữ liệu đó.

## 2026-10-02 — Backend integration Prompts 5–8 implemented and audited

- Read prompt requirements/UI rules again and verified BE branch/HEAD remains
  feat(api)/booking-sprint @577af2f; source/contracts match, no backend edits.
- Prompt5: product public catalog/course/class detail and course unit viewer;
  categories/mode/date filters and pagination match DTO, class price from course.
  Syllabus URL membership, history/reload, independent rail/content scrolling,
  empty/invalid states and keyboard native mobile drawer.
- Prompt6: STUDENT real cart with GET/POST/exact DELETE; class quantity1/max20,
  snapshot/current prices, server totals/availability and mutation/error refetch.
- Prompt7: checkout/own orders with paymentType-only payload, all CASH split
  receipts/PayOS receipt, synchronous double-submit guard, unknown-result reads
  orders/cart before deliberate retry, owner denial and server-confirmed expiry.
- Prompt8: fixed public header login query preservation, logout intent so a new
  account does not return to the previous private order, and bounded deadlines
  for requests that also support caller cancellation. Private components are
  keyed by userId and abort/reset on logout/account changes; no product storage.
- Pinned Node22.20.0/pnpm12.6.0 `pnpm check`: lint/boundaries, type-check,
  **109 unit tests (22 files)** and production build pass. Full Chromium E2E:
  **43 scenarios pass**, including regression1–4 and21 new mocked scenarios.
  Reviewed product desktop/mobile captures and tested1440/768/390/375 widths,
  keyboard/focus/drawers and unit independent scrolling; no page overflow.
- Live read-only health via FE3002 returned502 API_UNAVAILABLE. BE3000 absent,
  no backend node_modules/env/DATABASE_URL/test accounts; Docker daemon off.
  Google/SMTP credentials/config are unavailable. Live business/DB/Google/email
  smoke not run; mock evidence is not live verification. No seed/reset/destructive
  DB suite, business/migration changes, push/merge/deploy.
- Checkout ends at PENDING/PENDING_PAYMENT; payment confirmation, pending preview,
  ACTIVE learning/progress and reconciliation remain backend backlog.
  [Full evidence/routes/screenshots/blockers](./implement_phase/IMPLEMENTATION_PROMPTS_5_8.md).

## 2026-10-02 — Backend integration Prompts 1–4 implemented

- Implemented identity contract/ADMIN permissions, Google navigation/onboarding,
  admin categories/courses/units and classes/schedule/lifecycle against actual
  backend feat(api)/booking-sprint @577af2f. No backend changes or branch switches.
- Product auth and management now follow Ocean Editorial. Shared workspace has
  independent unit rail/content scrolling, URL/history selection, invalid-unit
  state and native mobile drawer. Course fields are separate; class edit collapsed.
- Extended exact adapter policy including PUTreorder, registration-intent paths,
  trusted Google navigation/callback and scoped transient cookies. Session writes,
  refresh/logout are serialized to prevent cookie races; validated callback announces
  account change to other tabs. Updated API/architecture/UI/config docs.
- Final validation on Node22.20.0/pnpm12.6.0: pnpm check passed Biome/boundaries,
  TypeScript,77unit tests and production build; all22Chromium E2E scenarios passed.
  Checked1440/768/390/375px and visually reviewed6product screenshots with mocked APIs.
  git diff --check passed. Preserved existing local changes; no push/merge/deployment.
- Live status: GETlocalhost:3000/api/v1/health/live connection refused, BE dependencies
  absent. Google/SMTP/live management smoke not verified. Mock tests are documented
  separately. Cancel class still does not release pending holds automatically.
- Aligned local/example APP_ORIGIN with dev/start port3002; no personal secret/config
  changes, no local env commit. Prompts5–8 remain next: public browse/unit viewer,
  real cart, pending checkout/orders and live QA; payment/learning still await BE.
- Full [handoff and evidence](./implement_phase/IMPLEMENTATION_PROMPTS_1_4.md).


## 2026-10-02 — Eight-session API integration handoff and course-unit layout

- Saved [8 copyable prompts](./implement_phase/PROMPTS_BACKEND_INTEGRATION.md)
  for fresh chats, with shared context, BE `feat(api)/booking-sprint` / `577af2f`,
  sequential scopes, real API boundaries and unchecked implementation checklist.
- Recorded user requirement: course-unit rail on the left with independent vertical
  scroll, selected content on the right, URL selection and responsive drawer.
  Admin units (prompt 3), public unit route (prompt 5) and QA (prompt 8) cover it.
- Copied the supplied Coursera screenshot unchanged into
  `ui-exploration/references/course-unit-coursera.png` so fresh chats retain the reference.
- Updated AGENTS, architecture and phase index to direct new chats to this handoff;
  historical FE contract baseline remains distinguishable from the current BE target.
- Documentation/reference only; no product UI or API integration was implemented.
- Validation: eight prompt blocks/checklist entries, balanced code fences, local
  links, identical screenshot checksum and scoped `git diff --check` passed.
  Runtime tests were not rerun for this documentation-only handoff.

## 2026-10-02 — Ocean Editorial UI rules

- Added `docs/ui-rules.md` as the design standard for new UI: source references,
  exact palette/font, layout, components, states, accessibility, responsive behavior
  and the implementation/review workflow.
- Required reading in `AGENTS.md`; linked from README, architecture and UI Lab docs.
- Rules distinguish selected preview styles/fixtures from production API behavior.
- Validation: checked tokens/layout values against current styles and verified local
  Markdown links/source references. Documentation-only change; no runtime tests needed.

## 2026-10-02 — Ocean Editorial selected; other concepts removed

- Kept layout 07, Ocean Editorial, with its four Home/Login/Register/Admin screens.
  `/ui-lab` now opens the selected Home directly; retired layout URLs return 404.
- Removed the other nine layout implementations, gallery, variant selector,
  light/dark hero comparison controls and assets, unused illustration components,
  discarded screenshots and obsolete CSS. The selected design keeps its original
  editorial composition and responsive behavior.
- Capture script and browser scenarios now target Ocean Editorial, including
  navigation, forms, admin interactions and rejection of retired layout routes.
- Product routes/API contracts are unchanged. This selects and cleans the preview
  implementation; no push or server deployment was performed.
- Validation: lint/module boundaries, TypeScript/production build, 23 unit tests
  and four Chromium E2E scenarios passed. All four views fit 1440/768/390/375px.
  Eight before/after desktop/mobile image comparisons are pixel-identical with
  the review toolbar hidden, confirming the selected layout was preserved.

## 2026-10-02 — Hero photo comparison for layouts 04 and 09

- Azure Studio and Blue Ribbon Home now default to the bright coding workspace
  hero, with a toolbar selector for light photo, dark photo, and original background.
- Direct comparison URLs use `?hero=light`, `?hero=dark`, or `?hero=original`.
  Selection persists when switching between the two supported Home layouts.
- Added local WebP assets, adjusted foreground colors and CTA contrast for each
  photo, and positioned the workspace below the text on mobile.
- Validation: Biome/module boundaries, TypeScript and production build passed.
  Browser checks covered both layouts/all three backgrounds at 1440/768/390px,
  toolbar switching, asset loading and absence of horizontal overflow. Desktop
  and mobile captures are in `ui-exploration/screenshots/hero-backgrounds`.


## 2026-10-02 — Five additional UI layouts

- Added Cobalt Mosaic, Ocean Editorial, Polar Workspace, Blue Ribbon and Horizon Split.
  UI Lab now contains ten concepts and 40 Home/Login/Register/Admin previews.
- New Home structures: asymmetric mosaic, magazine cover with contents column,
  learning workspace, zigzag content bands, and sticky split layout.
- New Auth structures: postcard, magazine spread, application window, ribbon card,
  and bottom sheet. New Admin structures: icon rail/mosaic, three columns,
  layered workspace navigation, overlapping banner/panels, and right agenda/dock.
- Reused local forms, fixtures, filters, pagination and preview states; no business API changes.
- Updated gallery, palettes, thumbnails and [direct links/comparison](./ui-exploration/README.md).
- Source formatting and TypeScript/build completed for local preview. Unit/E2E suites
  were not run for this addition, following the user's request to skip tests.
- Same branch `feat/ui-exploration-blue-white`; no push/merge/deployment.

## 2026-10-02 — Blue/white UI exploration implemented

- Implemented the [UI exploration plan](./implement_phase/PLAN_UI_EXPLORATION_BLUE_WHITE.md)
  on `feat/ui-exploration-blue-white`, frontend base `f674095`; existing checkout changes preserved.
- Added `/ui-lab` gallery and 20 previews: five distinct concepts, each with Home,
  Login, Register and Admin overview. Scoped CSS, no business API/session integration.
- Added local form validation/submission feedback, password visibility, role/status
  filters, pagination, loading/empty/error states, and keyboard-accessible mobile dialog.
- Added [handoff and comparison](./ui-exploration/README.md), 40 desktop/mobile PNGs,
  eight contact sheets and a reproducible screenshot capture script.
- Validation: lint/boundaries, TypeScript, 23 unit tests and production build passed;
  16 Chromium E2E scenarios passed. All 20 views checked at 1440/768/390/375px,
  with no body overflow or business API requests from previews. Public/identity/compiler
  regression journeys passed with mocked APIs. Screenshots visually reviewed.
- Checks used bundled Node 24.19.0 / pnpm 11.25.0 with engine warnings. The pinned
  Node 22.20.0 / pnpm 12.6.0 toolchain remains unverified because the Corepack cache
  lacks the pnpm 12.6.0 executable. No dependency versions were changed.
- UI preview only; no live backend validation, push, merge or deployment.

## 2026-10-02 — Blue/white UI exploration plan

- Added [UI exploration plan](./implement_phase/PLAN_UI_EXPLORATION_BLUE_WHITE.md)
  for five distinct blue/white concepts: Sky Blue, Pastel Cloud, White Blueprint,
  Azure Studio and Ice Minimal.
- Scope: Home, Login/Register and Admin overview; each concept has four preview
  screens (20 total), with palettes, layout directions, mock interactions,
  responsive states, task IDs, review criteria and a copy-ready handoff prompt.
- Proposed implementation branch: `feat/ui-exploration-blue-white`; the next coding
  agent creates the branch and UI preview. No branch or UI code was created here.
- Planning only; backend integration and production rollout are outside this task.
- Validation: Markdown links/fences/section numbering and `git diff --check` passed.
  Primary/white, body/background and muted/background color pairs in all five
  palettes exceed 4.5:1 in calculated contrast; implemented UI states still require
  visual/accessibility review. Runtime tests were not rerun for this docs-only plan.

## 2026-10-02 — Frontend implementation phase plans

- Added [implementation phases](./implement_phase/README.md) matching backend Phase 0–2:
  foundation/API adapter/deployment, registration/users/Google/password auth, and
  catalog/classes/cart/full cash or PayOS payment/enrollment.
- Each phase documents current source status, backend dependencies, target routes
  and ownership, numbered tasks, acceptance tests, two-person responsibilities and
  exit criteria. Phase 3 onward remains aligned with the backend roadmap.
- Compared backend local revision `608ff54` with frontend identity baseline `b500dbf`;
  recorded Google integration, pending-user status and admin-password contract drift
  as Phase 1 tasks. No runtime contracts or features were changed in this docs update.
- Phase 2 explicitly records missing management/enrollment read contracts and the
  PUT/DELETE adapter work; planned endpoints are not marked as implemented.
- These are implementation plans, not phase-completion claims. Live backend,
  Google and PayOS smoke tests were not run for this documentation change.
- Validation: relative Markdown links, section numbering, code fences and
  unchecked exit criteria passed; `git diff --check` passed. `pnpm check` passed
  lint/module boundaries, TypeScript, 23 unit tests and production build using the
  bundled fallback runtime (Node 24.19.0 / pnpm 11.25.0, with engine warnings).
  The pinned Node 22.20.0 / pnpm 12.6.0 check could not start because the Corepack
  cache lacks `pnpm/12.6.0/bin/pnpm.cjs`; browser E2E was not rerun for docs-only edits.

## 2026-10-02 — Local compiler playground

- Added independent compiler feature and /compiler route with homepage navigation.
- JavaScript editor, stdin, sample programs, Ctrl/Cmd+Enter, output/error status, exit code, duration and truncation feedback.
- Dedicated /api/v1/compiler/run adapter connects to the existing Docker runner in ../../test; validates byte limits and runner responses, checks Origin, and requires backend authentication on production/public hosts; local development remains available without login.
- Configured separate COMPILER_API_URL (default http://127.0.0.1:4000); no backend source changes.
- pnpm check passed: lint/boundaries, TypeScript, 23 unit tests and production build. All 4 Playwright scenarios passed, including compiler and mobile overflow checks.
- Real frontend → runner → Docker smoke passed: Hello output, stdin sum 10, runtime error with exit code 1. Started Docker Desktop and the companion runner API on port 4000 for testing.


## 2026-10-02 — Public registration and email verification

- Added /register with DTO validation, registration API call, confirmation and resend action.
- Added /verify-email?token=... with explicit verification, invalid/expired link feedback and role-based redirect.
- Verification installs the returned identity in the session and announces login across tabs; tokens stay in HttpOnly cookies.
- Existing /login API integration retained; added registration link and allowlisted the three public POST endpoints.
- Validation: pnpm check passed (lint/boundaries, TypeScript, 19 unit tests, production build). API tests use mocks; live backend and deployment were not tested.


## 2026-10-02 — Temporary health check

- Added a basic homepage button calling `GET /api/v1/health/live` through the same-origin adapter.
- Validates the response and displays loading, backend status/time, or a retryable failure message.
- Allowlisted only GET health/live and extended proxy policy checks.
- Validation: lint/module boundaries, TypeScript, and 3 proxy policy tests passed.

## 2026-09-30 — Foundation + identity UI

- Created separate `mindy-fe` sibling of `Mindy-BE`; source baseline: backend dev/b500dbf.
- Next.js App Router, React, TypeScript strict, pnpm, Biome, React Hook Form and Zod.
- Vietnamese responsive landing, login, account and management shell.
- Integrated real identity API contracts: session, user list/filter/create/detail/status and logout.
- Same-origin API adapter with Origin verification, endpoint allowlist, body limit and no-store.
- Single-flight refresh with cross-tab Web Locks; session events via BroadcastChannel.
- Added module boundary checks, CI, unit tests and mocked browser E2E tests.
- Backend code has not been modified. Frontend has no seeded/fake production data.

- `pnpm check`: passed (Biome/module boundaries, TypeScript, 15 unit tests, production build).
- `pnpm test:e2e`: 3 Chromium scenarios passed (login/user management, access control/mobile, proxy policy). E2E uses a mocked API, not the live backend.

## Next phases

1. Verify real Google OAuth, an external email provider and staging/production
   configuration. Local FE/BE/database/SMTP smoke passed on 2026-10-04; that does
   not certify those external environments.
2. Verify live provider PayOS settlement and external SMTP. PayOS UI/private class/
   ADMIN reconciliation are implemented against BE 5c9e581; return/cancel mapping,
   cash confirmation/preview, enrollment list and progress APIs remain deferred.
3. Later backend milestones: materials, attendance, chat, notifications, assignments,
   whiteboard, code judge and deployment. No placeholder modules without consumers.

## 2026-10-02 — Compiler deployed on server

- Deployed copied Docker runner from ../compiler-runner to /home/mindycode/mindycoding/compiler-runner, image mindy-compiler:20261002.
- Updated existing frontend Compose to image mindy-frontend:compiler-20261002 with private compiler network and COMPILER_API_URL=http://compiler-runner:4000.
- Production/public compiler checks backend session before execution. Local development can run without login. Runner has no published host port.
- Local pnpm check passed (23 tests); server runner image passed 4 tests; server frontend build passed lint/types/19 tests (existing deployed identity baseline retained).
- Server Docker smoke passed: Hello, stdin sum 10, runtime error, 4-second timeout, frontend connection and cleanup. Both containers healthy.
- Public /compiler returned 200 in Chromium. Public API unauthenticated requests return 401 and foreign Origin returns 403; login and health remain 200.
- Backup /home/mindycode/mindycoding/compiler-backup-20261002.tar.gz; previous frontend image retained for rollback.

## 2026-10-02 — Anonymous compiler testing

- Removed backend identity/session lookup from compiler adapter at user request; anonymous runs are now accepted on production for testing.
- Origin verification, input/body limits, isolated execution and runner concurrency/timeout limits remain enforced.
- Local pnpm check passed (23 tests); production frontend image mindy-frontend:compiler-anonymous-20261002 built with lint/types/19 tests passing.
- Deployed frontend; anonymous server request returned 200/success with expected stdout. Both frontend and compiler containers healthy.


## 2026-10-02 — Ocean Editorial course shop and cart

- Added `/ui-lab/ocean-editorial/courses` and `/cart`, linked from the shared header and Home course section.
- Catalog includes six fixture courses, editorial CSS artwork, accent-insensitive search, category/level filters, price sorting and an accessible syllabus dialog.
- Cart supports unique course selection, removal, derived totals, empty/loading states, suggestions and a preview registration review dialog; sessionStorage persists validated course IDs within the tab.
- This is an interactive UI Lab preview: fixture prices, no catalog/cart/payment API calls or real enrollment. Existing product routes remain independent.
- Validation: lint/module boundaries, TypeScript/production build and 23 unit tests passed; all six UI Lab browser tests passed, including 1440/768/390/375px layouts and cart persistence.
- Updated local preview on port 3001 and captured all six screens on desktop/mobile.

## 2026-10-05 — Learnthru reference dashboard

- Added isolated `/learnthru` route and `features/learnthru` component, following the user-supplied screenshot rather than the product design standard for this preview.
- Matched the desktop reference frame (1118×698 at x=41, y=101 on a 1200×913 viewport), three-column layout, colors, class cards, lesson table, profile, calendar, and reminders. Local replacement portraits and SVG illustrations stand in for unavailable original artwork.
- Added local class search, month/day selection, native preview dialogs, sample material download, and responsive layouts. No backend integration.
- Validation: production build, targeted Biome check, module boundaries, TypeScript, and Chromium desktop/mobile smoke checks; search, month navigation, dialog Escape, and mobile overflow checks passed.

## 2026-10-05 — First Learnthru admin migration

- Created root `UI.md` defining the new Learnthru design and incremental rollout; linked it from AGENTS, UI rules, and architecture.
- Migrated only `/management/users` to the three-column shell, soft gray workspace, pill controls, role filter shortcut cards, compact table, and real administrator profile. Other product pages retain their current shell.
- Preserved authentication/ADMIN guards, existing user API, URL filters, pagination, creation/detail links, error/retry, loading and empty states. No fixture data or API contract changes.
- Validation: production build/TypeScript, targeted Biome, module boundaries, all 9 existing identity browser tests, plus mocked API layout checks at 1440/1200/900/768/390/375px, shortcut filtering, empty state, mobile dialog/Escape, and overflow checks passed.

## 2026-10-05 — Edge-to-edge admin shell

- Removed outer gray canvas, padding, frame radius and shadow from the migrated admin shell; kept inner workspace styling. Updated UI.md to match.
- Targeted Biome and Chromium checks passed at 1440/768/390px: frame starts at (0,0), fills viewport width and has no horizontal overflow.
