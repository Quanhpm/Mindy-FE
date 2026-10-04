# Phase 1 — Registration, users, authentication và authorization baseline

## 1. Mục tiêu

Hoàn thành UI identity dùng chung cho các phase nghiệp vụ, đối ứng với
[Phase 1 backend](../../../Mindy-BE/docs/implement_phase/PHASE_1_IDENTITY_AUTH.md):

- Email/password registration dành cho STUDENT, xác minh email trước activation.
- Login bằng password hoặc Google; Google user mới hoàn tất form hồ sơ chung trước
  khi được cấp phiên, user đã có identity đăng nhập trực tiếp.
- Session bootstrap/recovery, logout một phiên và logout tất cả phiên qua HttpOnly cookies.
- ADMIN/MANAGER quản lý users; MENTOR/STUDENT đọc tài khoản của mình.
- Route, navigation và feedback đúng role; backend vẫn quyết định mọi quyền truy cập.

Password reset, profile edit và quản lý link/unlink identity chưa thuộc phase này.

## 2. Trạng thái hiện tại và contract drift

Đã có FE: `/login`, `/register`, `/verify-email`, `/account`, management users
list/filter/create/detail/status; auth context, refresh single-flight/Web Locks,
BroadcastChannel và adapter allowlist identity/email.

Backend local `608ff54` đã có source controller/service/DTO cho Google start,
callback, registration context và complete registration. Chưa có bằng chứng trong
lần đối chiếu này rằng Google live/staging hoặc toàn bộ exit criteria BE đã pass.

| Chênh lệch | FE hiện tại | BE source hiện tại | Task cần làm |
| --- | --- | --- | --- |
| Google flow | Chưa có UI, proxy chặn redirect | Có 4 endpoints Google/onboarding | FE-P1-C01/C02 |
| User status | Schema chỉ ACTIVE/SUSPENDED | Có thêm PENDING_VERIFICATION | FE-P1-A01, E02 |
| Admin create password | API docs/schema baseline 7–32 | CreateUserDto runtime 12–128 | FE-P1-A01/E01 |
| Swagger metadata | FE docs còn ghi mismatch cũ | CreateUserDto local đã khớp 12–128 | Đối chiếu deployment rồi cập nhật docs/types |
| Contract version | b500dbf | 608ff54 local | Ghi revision BE mục tiêu khi nghiệm thu |

Không sửa schema/UI trong tài liệu này. Đây là các hạng mục thực thi còn lại;
không đánh dấu Phase 1 hoàn tất chỉ vì email registration đã có.

## 3. Điều kiện bắt đầu

- Foundation/adapter/quality gate của Phase 0 dùng được.
- BE identity endpoints, migration và user test theo role sẵn sàng ở dev/staging.
- Mail sink/adapter cho verification; Google client/redirect URI thuộc môi trường test.
- Chốt origin/cookie/return path và API revision; không dùng credential production.
- BE hoàn tất các dependency auth/security còn thiếu trước nghiệm thu chung.

## 4. Ownership và cấu trúc mục tiêu

```text
src/features/auth/
  api/                 login/register/verify/session/Google context clients
  components/          forms, account, auth boundary, Google feedback
  schemas/             login, registration, onboarding schemas
  session/             provider, recovery và session events
  permissions/         role presentation và safe return path
  client.ts            public browser entry
src/features/users/
  api/                 management clients
  components/          list/create/detail/status
  schemas/             user inputs và list filters
  client.ts            public browser entry
src/shared/api/contracts/identity.ts
src/app/(auth)/...      route composition
src/app/api/v1/auth/... dedicated OAuth adapters khi triển khai
```

`users -> auth/client` là dependency được phép hiện tại. `auth` không import users;
identity response contract chung ở shared vì có hai consumer. Route dùng feature
entry, không import component private. Adapter OAuth cần entry server có consumer
thật; không đưa secret hoặc provider exchange vào client.

## 5. Route và quyền hiển thị

| Route | Người dùng | Hành vi |
| --- | --- | --- |
| `/login` | Public | Password form, Google action, lỗi tổng quát |
| `/register` | Public | Email/password profile, verification notice/resend |
| `/verify-email?token=...` | Public | Xác minh khi nhấn nút, feedback token lỗi/hết hạn |
| `/register/google` | Onboarding, đề xuất mới | Đọc context từ BE, form prefill, chưa coi là logged-in |
| `/account` | Authenticated | Hồ sơ read-only, logout/logout-all |
| `/management/users` | ADMIN/MANAGER | List, filter role/status, pagination |
| `/management/users/new` | ADMIN/MANAGER | Tạo tài khoản vận hành |
| `/management/users/[userId]` | ADMIN/MANAGER | Chi tiết và status action theo policy BE |

`/register/google` là route FE đề xuất, phải khớp `GOOGLE_REGISTRATION_PATH` BE.
Role fallback hiện tại: ADMIN/MANAGER về users; MENTOR/STUDENT về account.
`returnTo` chỉ cho relative route đã allowlist và phù hợp quyền; không tin URL callback
để quyết định phiên hoặc role. Phase 2 mở rộng destination bằng policy có test.

## 6. API contract và adapter dependency

Mọi path dưới đây sau `/api/v1`. Có source BE không đồng nghĩa đã chạy live smoke.

| Method/path | Trạng thái tích hợp FE | Success / boundary |
| --- | --- | --- |
| POST `/auth/register` | Đã nối | 202 `{ message }`, chưa có session |
| POST `/auth/email/resend` | Đã nối | 202 generic, không tiết lộ account existence |
| POST `/auth/email/verify` | Đã nối | 200 `{ user, accessTokenExpiresAt }` + auth cookies |
| POST `/auth/login`, `/auth/refresh` | Đã nối | 200 cùng auth response; refresh cookie-only |
| GET `/auth/me` | Đã nối | 200 User mới nhất |
| POST `/auth/logout`, `/auth/logout-all` | Đã nối | 204 + clear cookies |
| GET `/auth/google` | Cần adapter navigation | 302 Google + transient state cookie |
| GET `/auth/google/callback` | Cần adapter callback | 302 FE + clear/set cookies |
| GET `/auth/registration-context` | Chưa nối | 200 `{ email, displayName, avatarUrl, expiresAt }` |
| POST `/auth/google/complete-registration` | Chưa nối | 201 auth response + cookies, consume intent |
| GET/POST `/admin/users` | Đã nối, cần sync DTO | Paginated list / 201 User |
| GET `/admin/users/:userId` | Đã nối | 200 User |
| PATCH `/admin/users/:userId/status` | Đã nối, cần sync policy | 200 User |

Input theo DTO runtime mục tiêu:

- Login: email ≤320, password 1–128, optional deviceName ≤150.
- Public register: email ≤320, password 6–128, displayName 1–150 có ký tự không
  phải whitespace; optional phone 7–32. Không gửi role/status.
- Verify: token 32–512, optional deviceName; resend chỉ email.
- Google complete: displayName 1–150 có ký tự không phải whitespace, optional
  phone 7–32/deviceName ≤150; không gửi email/password/sub/provider token/role/status.
- Admin create: email ≤320, password 12–128, displayName 1–150, optional phone 7–32,
  role từ enum BE. Bỏ phone rỗng, không gửi response object làm payload.
- List: page ≥1, pageSize mặc định 20/tối đa 100, optional role/status;
  chưa có keyword search/sort tùy ý. Sort BE hiện là createdAt DESC.

User response gồm id/email/phone nullable/displayName/role/status/lastLoginAt nullable/
createdAt; datetime HTTP là string ISO. Enum response có PENDING_VERIFICATION nhưng
không suy ra mọi status đều là mutation hợp lệ; status transitions theo service BE.

## 7. Workstream A — Đồng bộ contract

### FE-P1-A01 — Identity schemas và docs

- Đối chiếu DTO/guard/service của BE revision đang deploy với local target.
- Bổ sung PENDING_VERIFICATION vào response/list/status labels và password admin
  12–128; tách schema public register khỏi admin create.
- Kiểm tra status service trước khi thêm action cho pending account.
- Cập nhật `docs/api-contracts.md`, revision và fixtures; chỉ dùng OpenAPI generated
  types sau khi verify metadata; Zod vẫn cần ở runtime boundary.

Acceptance: user pending không làm list/detail crash; payload không có field thừa;
schema nhận đúng response BE và từ chối dữ liệu sai. Có tests cho ranh giới password.

## 8. Workstream B — Email/password journeys

### FE-P1-B01 — Register, resend và verify

```text
register form -> POST register -> generic notice -> mở email link
  -> verify page -> explicit confirm -> POST verify
  -> cập nhật session -> role destination
```

- Tái sử dụng profile fields/validation giữa email và Google; password chỉ ở email flow.
- Generic notice như nhau cho email mới/đã có; không hiển thị account existence.
- Disable khi submit, cooldown/resend theo response BE, xử lý 429 khi được áp dụng.
- Không auto-consume link khi render/prefetch. Token chỉ gửi qua POST body, không
  storage/analytics/log; bỏ query token khỏi history bằng replace sau khi hoàn tất
  hoặc đã xác định link không dùng được. Tránh referrer rò token ra ngoài.
- Link hết hạn/đã dùng/sai và email outage có feedback; không tự activate user.

Acceptance: pending user chưa có dashboard; verify thành công cập nhật session và
tabs; replay link bị BE từ chối, UI cho quay về register/resend.

### FE-P1-B02 — Password login

- Invalid credentials dùng thông báo tổng quát; không phân biệt email/mật khẩu sai.
- Enter submit, password autocomplete phù hợp, pending state, keyboard focus rõ.
- Thành công bootstrap identity và redirect safe path theo role.
- Không retry credential failure hoặc lưu password/token vào browser storage.

Acceptance: 401/403/429/network failure có feedback đúng; safeReturnTo từ chối URL
ngoài origin, protocol-relative URL, backslash và ký tự điều khiển.

## 9. Workstream C — Google OIDC và profile completion

### FE-P1-C01 — Dedicated redirect adapters

Generic proxy hiện chặn 3xx và chỉ forward access/refresh cookie; không thể nối
Google bằng cách chỉ thêm endpoint vào allowlist. Triển khai adapter riêng:

1. Browser full-page navigation tới same-origin `/api/v1/auth/google`.
2. Next gọi BE start cố định với redirect manual, kiểm tra Location thuộc Google
   authorization origin/path đã chốt; trả 302 và giữ Set-Cookie riêng biệt.
3. Google callback đăng ký tới same-origin `/api/v1/auth/google/callback`; adapter
   forward query cần thiết và đúng transient cookie tới BE, không log code/state.
4. Callback BE trả Location về FE: chỉ cho `APP_ORIGIN` và path allowlist đã chốt;
   forward auth/onboarding/clear cookies, không follow redirect ở server.
5. Context/complete adapters chỉ forward onboarding cookie cho đúng hai endpoint.

Cookie hiện tại BE: `google_oauth_state` path `/api/v1/auth/google/callback`,
`registration_intent` path `/api/v1/auth`, access path `/`, refresh path
`/api/v1/auth/refresh`. Xác nhận tên/path bằng constants/controller khi implement.
Chốt `GOOGLE_REDIRECT_URI`, `FRONTEND_BASE_URL`, success/error/registration paths
của BE để cookie luôn thuộc browser origin frontend.

Backend sở hữu state/nonce/PKCE, code exchange, JWKS, verified claims và account
linking. FE không xử lý ID token hoặc giữ Google client secret/provider token.
Google action chỉ hiện/bật khi deployment đã bật feature; cần contract cấu hình
capability hoặc server config rõ ràng, không thử đoán từ query user.

Acceptance: existing user login được qua `/me`; callback success/error giữ và xóa
đúng cookies; Location lạ bị chặn; onboarding cookie không forward ra endpoint khác;
password flow vẫn chạy khi Google unavailable.

### FE-P1-C02 — Google onboarding

```text
Google callback user mới -> onboarding cookie -> /register/google
  -> GET registration-context -> email read-only + profile prefill
  -> POST complete-registration -> auth session -> role destination
```

- Loading context, invalid/expired intent và provider failure có UI riêng.
- Email locked; name editable/prefilled, optional phone; avatar chỉ preview hint an
  toàn theo URL policy đã chốt, chưa có upload. Không yêu cầu password Google-only.
- Không set authenticated từ context; chỉ install session từ complete success hoặc
  `/me` sau callback existing user.
- Không đưa intent/sub/email claims vào hidden payload hoặc storage để tự xác minh.
- Khi submit không rõ kết quả, đọc `/me` trước; không tự replay complete one-time.

Acceptance: Google user mới bắt buộc đủ profile trước authenticated UI; expired
intent yêu cầu bắt đầu lại; merge existing/pending email chỉ do BE quyết định, UI
không tự tạo account khác hoặc giữ password đăng ký chưa được verify.

## 10. Workstream D — Session và authorization UX

### FE-P1-D01 — Bootstrap và refresh

- Session có trạng thái loading/authenticated/anonymous/error; không flash private UI.
- Bootstrap `/me`; 401 recover rồi đọc identity. Một tab shared Promise; nhiều tab
  Web Locks và đọc lại `/me` trong lock trước refresh để tránh rotation trùng.
- Không retry 403, credential failures hoặc network mutation. Chỉ replay tối đa
  một lần sau guard 401 `AUTHENTICATION_REQUIRED` trước mutation.
- Failure refresh: clear client identity/private data, thông báo hết phiên và về login
  với return path an toàn; lỗi mạng bootstrap có retry riêng.
- BroadcastChannel login/logout; không broadcast token hoặc thông tin nhạy cảm.

Acceptance: concurrent requests và hai tabs không tự tạo refresh storm; suspended/
revoked user tuân theo BE; logout hủy/ignore response private đang về sau đó.
Document browser fallback nếu Web Locks không có; HTTPS/localhost là baseline.

### FE-P1-D02 — Role navigation và logout

- AuthBoundary chỉ điều khiển UX, không thay BE guard/ownership.
- ADMIN/MANAGER thấy users nav; MENTOR/STUDENT deep-link vào management có forbidden
  feedback, không fetch danh sách users trước khi xác định role.
- Logout current/all chờ API 204; đồng bộ tabs, xóa state private và redirect login.
- Logout-all có xác nhận phù hợp; không tuyên bố phiên đã revoke nếu request thất bại.

Acceptance: refresh page/deep link đúng role; 401 và 403 khác nhau; logout-all scope
được smoke bằng hai browser sessions thật, BroadcastChannel chỉ hỗ trợ UX cùng origin.

## 11. Workstream E — Users management

### FE-P1-E01 — List/create/detail

- List pagination/filter trong URL, no-store, abort request cũ, loading/empty/error.
- Hiển thị role/status/email/date đúng schema; không thêm search backend chưa hỗ trợ.
- Create form khớp runtime DTO; 409 email/phone conflict và 422 có feedback rõ.
- Detail 404/403 khác nhau theo API; không thêm edit role/profile/avatar ngoài scope.

Acceptance: filter/page survives reload/back; create 201 cập nhật list/detail bằng
response BE; response không có hash/token và UI không dựa vào dữ liệu seed giả.

### FE-P1-E02 — Status actions và pending account

- Confirm suspend/activate, disable khi pending, đọc lại user sau mutation.
- Pending là trạng thái đọc/list hợp lệ; chỉ cung cấp action được service BE cho phép.
- Service local hiện patch status trực tiếp, chưa có transition/claim workflow đủ
  theo kế hoạch BE. Phải chốt policy/guard backend trước khi thêm pending activation
  action; frontend không phải ranh giới bảo mật thay cho phần còn thiếu này.
- Nếu admin claim pending registration có flow riêng, cần contract từ BE trước khi
  thêm UX; không dùng patch ACTIVE để bỏ qua email verification tùy ý.

Acceptance: invalid transition/conflict hiển thị state mới từ BE; status action không
tự kết luận đã revoke session hoặc verify email nếu backend không trả bằng chứng.

### FE-P1-E03 — Provisioning dependencies theo kế hoạch BE

- Phase 1 BE có mục tiêu admin provision Google-only user với password optional và
  login-method presentation. Controller/DTO local hiện bắt buộc password 12–128;
  đây là contract chưa hoàn tất, không bỏ password trong create payload hiện tại.
- Chờ BE chốt DTO/login-method response rồi thêm lựa chọn provisioning và safe
  presentation tương ứng; không hiển thị provider subject hoặc credential.
- Pending-email admin claim cần endpoint/workflow/audit được BE triển khai, không
  thay bằng status patch. Ghi dependency trong progress nếu chưa sẵn sàng.

Acceptance: provisioning đúng DTO/permission, Google-only không bị gán password giả,
pending claim không giữ credential chưa verify; tests FE và BE tương ứng pass.

## 12. Error, security và operational contract

- 401: credential/session/intent theo endpoint; 403: role/ownership; 404: resource;
  409: management conflict; 422: field validation; 429: rate limit; 5xx: retryable read.
- Public auth dùng thông báo tổng quát; không render raw provider/database error.
- Personal response no-store; cookies HttpOnly/Secure/SameSite/path đúng môi trường.
- Same-origin Origin check vẫn giữ cho register/verify/complete và mutations.
  OAuth callback GET được BE bảo vệ bằng state, không thay bằng Origin mutation policy.
- Verification/OAuth pages không đưa query nhạy cảm vào logs/analytics/referrer.
- Mail sink/mock OIDC dùng cho automated tests; Google client thật dùng staging riêng.
- Account enumeration, linking, refresh reuse commit, rate limiting và CSRF ở BE
  phải được test trong BE suite; FE tests không chứng minh các invariants đó.

## 13. Testing plan

### 13.1 Unit và adapter integration

- Registration/admin input boundaries, optional phone, whitespace name, pending enum.
- Auth response/context runtime validation, generic errors và return path allowlist.
- Refresh single-flight/Web Locks behavior, guard-only replay, logout/session events.
- OAuth Location allowlist, transient/onboarding cookie filtering, nhiều Set-Cookie,
  callback clear-cookie cả success và failure; credentials không tới endpoint khác.

### 13.2 Browser E2E với API mô phỏng

- Register → generic notice → resend → explicit verify → account.
- Invalid/expired/replayed link, register/resend existing email notice giống nhau.
- Password login success/failure, suspended user, role nav, mobile/keyboard.
- Google existing user → `/me`; user mới → context prefill → complete profile.
- Context hết hạn/feature disabled, callback generic error, unsafe returnTo.
- Users pending/filter/page/create/status, 409/422 feedback và deep-link forbidden.
- Hai tabs recovery/logout; delayed private response sau logout không hiện dữ liệu.

### 13.3 Smoke tích hợp FE → BE

- Email đăng ký qua mail sink, verify một lần, HttpOnly cookies và `/me` qua proxy.
- Admin create với password 12–128, list pending và status transitions thực tế.
- Access expiry → refresh → identity; logout current/all trên hai sessions.
- Google test client: existing user và new onboarding, exact redirect URI/cookies,
  cancelled consent và expired intent. Không dùng live credential trong fixture.
- `pnpm check`, E2E pass; ghi rõ những smoke đang chờ BE/security/config.

## 14. Thứ tự triển khai đề xuất

1. FE-P1-A01 — sync revision/DTO/status/policy và API docs.
2. FE-P1-B01/B02 — rà soát email/password và profile fields chung.
3. FE-P1-D01/D02 — session recovery, role/returnTo, logout.
4. FE-P1-E01/E02/E03 — users management và provisioning theo contract đã chốt.
5. Chốt OAuth deployment/capability; FE-P1-C01 adapters rồi C02 onboarding.
6. Unit/adapter/E2E, mail sink + Google staging smoke, cập nhật progress/exit checklist.

## 15. Phân công hai người

| Người | Ownership | Review / đồng bộ |
| --- | --- | --- |
| A | Email/Google profile forms, users UI, pending display, navigation/accessibility | B review DTO và session boundaries |
| B | Identity clients, session/recovery, OAuth adapters/cookies, fixtures/tests | A review browser journeys và error UX |

Một người sở hữu auth response/shared identity schema; một người sửa generic/OAuth
adapter trong mỗi nhánh. Cùng BE chốt callback origin, cookie names/path, profile
fields, feature enablement và status policy trước khi triển khai Google UI.

## 16. Exit criteria

- [ ] FE schemas/docs khớp revision BE nghiệm thu, gồm pending status/admin password.
- [ ] Email registration không cấp phiên trước verify; register/resend generic.
- [ ] Verify explicit, token one-time/expiry feedback và sensitive URL được xử lý.
- [ ] Password login, `/me`, refresh, logout/current-all qua cookies chạy đúng.
- [ ] Cross-tab recovery/session events và private data cleanup có tests.
- [ ] Google start/callback adapters kiểm tra redirects/cookies và không lộ token.
- [ ] Google mới hoàn tất profile prefill/read-only email trước auth; existing login trực tiếp.
- [ ] Onboarding hết hạn/lỗi và Google outage có feedback, password vẫn dùng được.
- [ ] Users list/create/detail/status đúng role/DTO/policy, pending user không crash.
- [ ] Google-only provisioning và pending-admin-claim dependency được chốt cùng BE.
- [ ] Deep link, keyboard/mobile, loading/error/empty và expected errors có E2E.
- [ ] Unit/adapter tests, `pnpm check` và browser E2E liên quan pass.
- [ ] Live email/session/users + Google staging smoke có bằng chứng.
- [ ] Dependency Phase 1 BE về migrations/auth/security/test suite được nghiệm thu.
- [ ] `docs/progress.md`, `docs/api-contracts.md` và architecture cập nhật đúng.

## 17. Ngoài scope

- Forgot/reset password, MFA, provider ngoài Google, Google API access tokens.
- Profile/role edit, avatar upload, link/unlink identity UI và session/device dashboard.
- FE tự hash password, verify JWT/OIDC, merge identities hoặc sửa transaction refresh.
- Catalog, class, cart, payment và enrollment: Phase 2.
