# Phase 0 — Foundation, API adapter và deployment baseline

## 1. Mục tiêu

Tạo nền tảng frontend để hai thành viên phát triển trên nhiều thiết bị với cùng
cấu trúc source, UI, contract, kiểm thử và quy trình deploy. Kết thúc phase này,
checkout mới chạy được Next.js, gọi NestJS qua adapter cùng origin, có quality gate
và production artifact có thể triển khai/rollback.

Đối ứng với [Phase 0 backend](../../../Mindy-BE/docs/implement_phase/PHASE_0_FOUNDATION.md).
Frontend không kết nối PostgreSQL, không chạy migration hoặc giữ JWT private key.
Health BE và schema/migration là dependency do backend vận hành.

## 2. Trạng thái hiện tại

Đã có trong source:

- Next.js App Router, React, TypeScript strict, Node `22.20.0`, pnpm `12.6.0`.
- Biome, React Hook Form, Zod, Vitest, Playwright và `pnpm check`.
- `src/app`, `src/features`, `src/shared`, feature public entry và boundary script.
- Landing tiếng Việt, app shell, design tokens, feedback và error/not-found routes.
- Adapter `src/app/api/v1/[...path]/route.ts`: allowlist identity/health, Origin,
  auth-cookie forwarding, no-store, request ID, body 32 KiB và timeout 10 giây.
- Server env validation ở request boundary; env sai trả lỗi cấu hình chung.
- CI `.github/workflows/check.yml`: install frozen lockfile, check, Chromium E2E.
- Health button gọi `GET /api/v1/health/live` và kiểm tra response schema.

Cần xác nhận/hoàn thiện để đóng phase:

- Onboarding tái lập từ clean checkout trên cả hai môi trường phát triển.
- Runbook build/deploy/rollback frontend được lưu trong repo; các lần deploy compiler
  trong progress chưa thay thế việc nghiệm thu baseline frontend.
- Kiểm thử adapter đầy đủ với backend unavailable, nhiều Set-Cookie, streaming body,
  path/method bị chặn và lỗi cấu hình.
- Smoke tích hợp thực tế qua reverse proxy, không chỉ API mô phỏng.
- Baseline accessibility, responsive, cache và request correlation khi có lỗi.

Các mục trên là kế hoạch nghiệm thu, chưa khẳng định các test/deploy đó đã chạy.

## 3. Điều kiện bắt đầu và dependency BE

- Có Node/pnpm đúng phiên bản và lockfile frontend được commit.
- Backend có prefix `/api/v1`, error body và cookie contract ổn định.
- Liveness BE hiện có; readiness backend phải hoàn tất theo Phase 0 BE trước go-live.
- Development/staging tách production, có tài khoản test do backend provision.
- Chốt hostname, origin, HTTPS termination và đường truy cập BE trong deployment.

FE process còn sống và BE sẵn sàng là hai kiểm tra riêng. Không dùng health button
trên trang chủ làm readiness của container Next.js hoặc bằng chứng DB sẵn sàng.

## 4. Quyết định kiến trúc

### 4.1 Cấu trúc và boundary

```text
src/
  app/                         route, layout, composition, API adapter
    _components/               shell, navigation ghép các feature
    _providers/                composition của providers
    (public)/                  landing và public routes
    (auth)/                    identity routes
    (protected)/               account và management routes
    api/v1/[...path]/          allowlisted NestJS adapter
  features/                    UI, client, schema theo nghiệp vụ
  shared/
    api/contracts/             contract có nhiều consumer thật
    components/               feedback chung
    config/                    server env validation
    lib/http/                  transport và lỗi
    ui/                        primitives, tokens và display
tests/e2e/                     browser journeys
scripts/check-boundaries.mjs   kiểm tra import graph
```

Đây là bản đồ trách nhiệm, không phải yêu cầu tạo đủ mọi thư mục mới. Business UI
ở feature; route chỉ ghép UI và route params. Secret dùng `server-only`, không export
chung server/client trong barrel. Không thêm UI framework hoặc state library khi
consumer hiện có chưa cần.

### 4.2 Rendering và dữ liệu

- Public nội dung không cá nhân có thể render server; form và dashboard tương tác
  render client theo kiến trúc hiện tại.
- Không fetch dữ liệu cá nhân trước khi session bootstrap hoàn tất.
- Nếu bổ sung server fetch cá nhân: chỉ forward cookie tới BE tin cậy, no-store,
  không hydrate raw token và có đường phục hồi session ở browser.
- Không cache response identity/order/enrollment chung giữa người dùng.
- Không dùng localStorage làm session store. Query/page không chứa PII hoặc secret.

## 5. Luồng runtime mục tiêu

```text
Browser (HTTPS, same origin)
  -> reverse proxy
  -> Next.js routes + /api/v1 adapter
  -> fixed API_BASE_URL của NestJS trên private network
  -> PostgreSQL do backend quản lý
```

Google redirect và compiler runner cần policy riêng ở phase/feature tương ứng.
Generic adapter không nhận URL upstream từ browser và không tự follow redirect.

## 6. Workstream A — Tooling và environment

### FE-P0-A01 — Onboarding tái lập

- Giữ `.node-version`, `.nvmrc`, `packageManager`, engines và CI khớp nhau.
- Install từ lockfile; document `pnpm hooks:install`, cổng dev `3001`, E2E `3101`.
- Không commit `.env.local`, token, credential hoặc tài khoản production.

Acceptance: clean checkout install/build được; README đủ để người thứ hai chạy app
mà không cần copy source hoặc cấu hình bí mật từ máy người thứ nhất.

### FE-P0-A02 — Server env contract

| Biến | Consumer | Quy tắc |
| --- | --- | --- |
| `API_BASE_URL` | Generic NestJS adapter | HTTP(S), endpoint cố định có `/api/v1`, không query/fragment/credential |
| `APP_ORIGIN` | Origin validation | Chỉ origin, khớp URL browser, không trailing slash |
| `COMPILER_API_URL` | Adapter compiler riêng đang có | Origin runner, tách BE; ngoài core-flow acceptance |

- API URL không dùng `NEXT_PUBLIC_*`; env được đọc ở server request boundary.
- Local thống nhất `localhost`; production HTTPS và cookie Secure do BE phát hành.
- Thiếu/sai cấu hình trả lỗi an toàn; log vận hành đã redact để truy vết.

Acceptance: đổi env không cần đưa secret vào client bundle; lỗi cấu hình không lộ
API private URL hoặc stack trace cho browser.

## 7. Workstream B — UI foundation và route composition

### FE-P0-B01 — Design tokens và reusable primitives

- Chuẩn hóa màu, spacing, typography, focus, error/success và disabled states.
- Dùng primitives hiện có; chỉ thêm input/table/dialog dùng chung khi có consumer.
- Label/input association, focus thấy được, icon button có accessible name.

Acceptance: landing/auth/shell thống nhất UI; keyboard dùng được; ở viewport 375px
không có overflow toàn trang. Table rộng có vùng scroll riêng khi cần.

### FE-P0-B02 — Feedback và route failures

- Loading không gây submit lặp; empty có hướng dẫn phù hợp với quyền.
- Error boundary có retry; not-found không tiết lộ resource private.
- Hiển thị lỗi tiếng Việt và request ID khi cần hỗ trợ, không dump raw response.

Acceptance: backend unavailable, request đang tải và danh sách rỗng có màn hình
rõ ràng; retry không vô tình gửi lại mutation chưa xác định kết quả.

## 8. Workstream C — HTTP adapter và contract baseline

### FE-P0-C01 — Proxy policy

- Allowlist method/path cụ thể, không wildcard cho toàn bộ backend.
- Mutation phải có Origin đúng; request cookie chỉ chứa auth cookies đúng route.
- Giữ từng Set-Cookie riêng, kể cả clear cookie; không forward Authorization tùy ý.
- No-store cho response cá nhân; upstream redirect generic trả lỗi có kiểm soát.
- Kiểm tra body limit cả Content-Length và chunked input; timeout/abort có feedback.
- Request ID đi tới BE và về browser; không log password, cookie hoặc token.

Acceptance: endpoint/method lạ bị chặn trước upstream; Origin sai trả 403;
upstream/network/config failure có error body nhất quán; response 204 không bị parse
như JSON. Giới hạn upload tương lai phải có adapter/policy riêng.

### FE-P0-C02 — Browser transport và runtime schemas

- Browser transport dùng cùng origin `/api/v1`, credentials và error normalization.
- Parse response bằng schema; không cast unknown thành domain type để bỏ validation.
- Input DTO và response model riêng. Error có `statusCode`, `code`, `message`,
  `details?`, `requestId?`; không mặc định mọi 422 là `VALIDATION_FAILED`.
- Hủy request cũ khi filter/route thay đổi, tránh response cũ ghi đè state mới.

Acceptance: error/schema mismatch hiển thị đúng; không render dữ liệu không hợp lệ
hoặc retry 403; auth recovery được bổ sung/kiểm thử trong Phase 1.

## 9. Workstream D — Health và observability baseline

### FE-P0-D01 — Health tích hợp

- Dùng `GET /health/live` hiện có qua adapter để smoke đường FE → BE.
- FE container health dùng HTTP route ổn định; kiểm tra readiness BE riêng trong deploy.
- Chỉ thêm readiness vào FE allowlist nếu có consumer vận hành thật.

Acceptance: tắt BE thì FE vẫn render được trang và báo lỗi health rõ; deploy phân
biệt FE lỗi khởi động với BE dependency unavailable.

### FE-P0-D02 — Error correlation

- Document request ID của adapter/BE và cách tra log tương ứng.
- Log method, route không chứa sensitive query, status, duration theo nhu cầu.
- Redact verification token và OAuth callback query trong reverse proxy/access logs.
- Client error reporting, nếu thêm, không gửi form values/password/cookies.

Acceptance: một lỗi staging truy từ browser đến BE được mà không cần lộ secret.

## 10. Workstream E — Test infrastructure và CI

### FE-P0-E01 — Phân tầng kiểm thử

| Tầng | Công cụ | Chứng minh |
| --- | --- | --- |
| Unit | Vitest | Schema, policy, transport, error mapping |
| Adapter integration | Request/Response + upstream fake | Forward cookie/header/body, limit, Origin, timeout |
| Browser E2E | Playwright + API mô phỏng | UX, route, session feedback, responsive |
| Live smoke | FE + BE staging thật | Cookie/origin/proxy và contract xuyên hệ thống |

Fixture không có credential thật. Test BE về DB/migration/concurrency giữ ở backend;
FE không thêm database dependency để lặp lại test đó.

### FE-P0-E02 — Quality gate

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
```

`check` gồm lint/boundaries, route types + TypeScript, unit tests và production build.
E2E hiện chạy Next production build ở `3101` với API fake `3199`; không dùng backend
production. CI cài Chromium cùng system dependencies theo workflow hiện có.

Acceptance: PR bị chặn khi một gate fail; failure artifact không chứa raw token/PII;
ghi rõ test mock và smoke thật trong progress.

## 11. Workstream F — Build, deploy và rollback

### FE-P0-F01 — Production artifact

- Dùng lockfile, multi-stage/container hoặc artifact phù hợp hạ tầng đã chọn.
- Runtime non-root, không chứa `.env.local`/secret và chỉ có dependency cần thiết.
- `next.config.ts`, assets và runtime env tương thích cách đóng gói.
- FE → BE dùng Docker service hostname/private endpoint khi deploy container.

Acceptance: clean build chạy được với env staging; HTML/assets/API adapter hoạt động;
không đưa backend JWT key hoặc database URL vào frontend image/bundle.

### FE-P0-F02 — Thứ tự deployment

```text
1. BE migration/readiness gate thành công theo Phase 0 BE
2. Build/test artifact FE khớp contract BE đang chạy
3. Cấu hình API_BASE_URL, APP_ORIGIN và HTTPS proxy
4. Deploy FE, kiểm tra health FE
5. Smoke assets, FE -> BE health và cookies qua HTTPS
6. Mở traffic; giữ artifact trước để rollback
```

Document incompatibility nếu FE mới cần API BE mới. Rollback frontend không revert
migration BE. Secrets/config có owner và được quản lý ngoài Git.

## 12. Acceptance tests

- Clean checkout: copy env mẫu, install, hooks, dev; landing và health hiển thị đúng.
- Env sai: API trả safe failure, page không lộ cấu hình nội bộ.
- Proxy: Origin sai, path/method lạ, body quá lớn, timeout, 204 và nhiều Set-Cookie.
- UI: desktop/mobile, tab navigation, loading/error/retry/empty/not-found.
- Build: lint/types/unit/build/E2E pass; smoke HTTPS qua proxy staging.
- Recovery: rollback artifact FE trước vẫn gọi được backend đã triển khai.

## 13. Thứ tự triển khai đề xuất

1. FE-P0-A01/A02 — tooling/env và onboarding.
2. FE-P0-B01/B02 — UI và feedback baseline.
3. FE-P0-C01/C02 — adapter/contract/policy tests.
4. FE-P0-D01/D02 — health và request correlation.
5. FE-P0-E01/E02 — quality gates và isolation.
6. FE-P0-F01/F02 — artifact/deploy/rollback, live smoke và progress.

## 14. Phân công hai người

| Người | Ownership | Điểm review chung |
| --- | --- | --- |
| A | App routes/shell, tokens/primitives, feedback, responsive/accessibility | B review route composition, keyboard và mobile |
| B | Env, adapter/transport, boundary checks, CI/deploy/tests | A review cookie/Origin policy và onboarding |

Một người sở hữu generic adapter trong mỗi thay đổi; người còn lại review boundary
và test. Hai người cùng chốt env, error contract và staging origin với BE.

## 15. Exit criteria

- [ ] Clean checkout chạy được trên cả hai môi trường với phiên bản đã pin.
- [ ] Cấu trúc/public entry và module boundary gate hoạt động.
- [ ] Tokens, shell, loading/error/empty và mobile/keyboard baseline được nghiệm thu.
- [ ] Server env validation không lộ secret/cấu hình private.
- [ ] Proxy method/path/Origin/cookie/body/timeout/no-store có test.
- [ ] Health FE và BE được kiểm tra độc lập; lỗi truy vết được bằng request ID.
- [ ] `pnpm check` và E2E liên quan pass trong CI.
- [ ] Production artifact chạy được; runbook deploy/rollback lưu trong repo.
- [ ] Smoke staging qua HTTPS/proxy thật và rollback rehearsal có bằng chứng.
- [ ] `docs/progress.md` cập nhật đúng kết quả và dependency BE.

## 16. Ngoài scope

- Triển khai database, migration, seed, backup hoặc BE readiness logic.
- Hoàn thiện Google/email/session/users: Phase 1.
- Catalog, classes, cart, payment và enrollment: Phase 2.
- Upload/materials, monitoring đầy đủ và tối ưu production mở rộng: phase sau.
- Compiler playground hiện có là module thử nghiệm riêng, không là điều kiện đóng
  core-flow Phase 0 và không chứng minh compiler/judge milestone đã hoàn tất.
