# Kết quả triển khai Prompt 1–4

Ngày 2026-10-02. Đã đọc PROMPTS_BACKEND_INTEGRATION và ui-rules, triển khai
4 prompt đầu trong `mindy-fe` theo Ocean Editorial. Đối chiếu backend
`feat(api)/booking-sprint` / `577af2f0e11607ed827be9ac1f9682a9c629f7b8`;
không đổi nhánh, sửa backend, migration/seed, push/merge/deploy.

## Phần đã triển khai

| Prompt | Chức năng và routes |
| --- | --- |
| 1 | Identity chỉ ADMIN/MENTOR/STUDENT; management chỉ ADMIN; PENDING_VERIFICATION; admin password12–128/public6–128; login/register/verify/account/users |
| 2 | Google link trên login/register, trusted start/callback adapters, transient cookies và `/register/complete`; context/expiry/read-only email/session/multi-tab |
| 3 | `/management/course-categories`, `/management/courses`, `/new`, `/[courseId]`; tạo/sửa/kích hoạt course, thêm/reorder/read units |
| 4 | `/management/classes`, `/new`, `/[classId]`; full-pagination course/mentor pickers và URL filters, schedule, lifecycle, date/time và409 refetch |

Course/unit workspace và class/unit schedule dùng rail 300px bên trái và panel bên
phải cuộn riêng, selection URL/reload/back-forward, unavailable state, drawer native
mobile hỗ trợ Tab/Escape/trả focus. Không tạo unit/session edit/delete API giả,
progress/video/quiz/lab hoặc giả trạng thái thanh toán.

Product shell và auth dùng đúng Ocean palette/font/controls. Shell có navigation
thật tới các màn hình mới và profile từ session; preview fixtures giữ riêng.
MANAGER đã bỏ cả khỏi UI Lab labels/fixtures. Không còn bản UI product xanh lá cũ.

Generic adapter mở chính xác endpoints của4 prompt và PUT reorder; Origin mutation,
32KiB body, timeout/no-store/cookie policy được giữ. Session mutations và refresh
được serialize trong/multi-tab để tránh response cũ ghi đè cookie mới; logout
recovery tránh nested lock. Existing Google callback thông báo đổi phiên sang các
tab sau identity bootstrap hợp lệ, marker không chứa user/token và bị xóa một lần.

## Bằng chứng đã chạy

- Runtime thực tế **Node 22.20.0 / pnpm 12.6.0**. Khôi phục native pnpm executable
  trong cache Corepack; quality gate dùng PATH tạm để nested pnpm không rơi về
  fallback 11.25.0/Node 24. Không đổi dependency/package-manager pins.
- `pnpm check`: Biome, module boundaries, Next typegen/TypeScript, **77 unit tests**
  và production build đều pass. Route output có toàn bộ routes mới.
- `pnpm test:e2e`: **22/22 Chromium scenarios pass**, chạy sau production build.
  Các business API dùng mocks, adapter security tests kiểm tra adapter thật với
  upstream fetch mock; đây không phải live backend/Google/SMTP smoke.
- Browser coverage: identity/create/status/logout, Google link/error/onboarding
  DTO/session/expired intent, category/course/unit/reorder/edit/activate, class
  pickers tới hơn 100 lựa chọn qua nhiều trang/filters/snapshot session/OPEN edit whitelist/lifecycle,
 409 refetch/field preservation, STUDENT guards, independent scroll, long heading,
  URL/history/reload/invalid unit và keyboard drawer.
- Viewports 1440/768/390/375px không tràn ngang trong scenarios được kiểm tra.
  Đã xem trực tiếp 6 ảnh product captures bên dưới; chỉnh copy auth còn sót và giữ
  class editing thu gọn để workspace mặc định nằm trong viewport.
- `git diff --check` và local documentation links: pass. Những changes
  staged/unstaged/untracked có sẵn được giữ.
- Read-only/local frontend check tại port 3002: login200 với copy mới; mutation
  cùng Origin qua adapter tới upstream và nhận502 vì BE chưa chạy; Origin lạ403;
  Google start khi BE chưa chạy trả303 tới login với google_unavailable. Không
  dùng các kết quả này để đánh dấu live business/Google pass.

## Cấu hình và phần chưa xác minh live

Default dev/start frontend dùng port 3002. Đã căn APP_ORIGIN trong `.env.example`
và riêng dòng origin ở `.env.local` thành `http://localhost:3002`; API_BASE_URL
và cấu hình cá nhân khác được giữ. `.env.local` vẫn ignored, không commit.

Read-only GET `http://localhost:3000/api/v1/health/live` trả connection refused;
backend checkout hiện không có node_modules. Chưa có backend chạy để thực hiện
live email/Google/catalog/class smoke, nên không đánh dấu live pass. Không chạy
seed/reset/destructive tests trên DB ứng dụng. Google phải cấu hình đúng frontend
origin và callback adapter URI như [hướng dẫn](./prompt-1-2-report.md).

Cancel class hiện chưa tự giải phóng pending seat holds; UI xác nhận nêu giới hạn
và backend cần order expiry xử lý. Prompt 5–8 còn public catalog/unit viewer,
cart thật, checkout/own orders và QA live. Payment/ACTIVE learning còn chờ backend;
không đánh dấu toàn Phase2 complete.

## Tài liệu và ảnh

- [Identity/Google](./prompt-1-2-report.md)
- [Catalog/course units](./prompt-3-report.md)
- [Class schedule/lifecycle](./prompt-4-report.md)
- [API contracts](../api-contracts.md), [architecture](../architecture.md),
  [progress](../progress.md), [UI rules](../ui-rules.md)

Ảnh là product UI chạy với API mô phỏng phục vụ QA:

| Màn hình | Desktop | Mobile |
| --- | --- | --- |
| Login | [1440px](./screenshots/mock-login-1440.png) | [390px](./screenshots/mock-login-390.png) |
| Course units | [1440px](./screenshots/mock-course-units-1440.png) | [Drawer390px](./screenshots/mock-course-drawer-390.png) |
| Class schedule | [1440px](./screenshots/mock-class-schedule-1440.png) | [Drawer390px](./screenshots/mock-class-drawer-390.png) |
