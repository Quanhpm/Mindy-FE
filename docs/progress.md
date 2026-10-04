# Frontend progress

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
2. PayOS/cash payment confirmation, pending preview, ACTIVE enrollment/content/
   progress and payment reconciliation when backend APIs exist.
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
