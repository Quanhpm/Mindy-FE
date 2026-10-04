# Prompt 1–2 — Identity contract và Google onboarding

Cập nhật 2026-10-02. Đối chiếu checkout BE thực tế:
`feat(api)/booking-sprint`, `577af2f0e11607ed827be9ac1f9682a9c629f7b8`.
Không đổi nhánh, chạy migration/seed hoặc sửa backend.

## Prompt 1

- Identity schema, role labels và form chỉ nhận ADMIN/MENTOR/STUDENT.
  `canManageUsers` và management AuthBoundary chỉ chấp nhận ADMIN.
- Response/list filter/status label nhận PENDING_VERIFICATION/ACTIVE/SUSPENDED.
  Endpoint cập nhật status giữ đúng enum BE; backend vẫn quyết định thao tác.
  Pending user chỉ được kích hoạt khi ADMIN xác nhận “Kích hoạt thủ công”; UI
  phân biệt thay đổi status này với xác thực email. Không tự kích hoạt khi đọc user.
- Admin create password 12–128; public register vẫn 6–128. Không còn ghi chú
  Swagger mismatch cũ trong validator/product form.
- Rà login/register/verify-email/account và users list/new/detail. Các route auth
  dùng AuthPage Ocean Editorial có một h1, form thật, các token product do shell cấp;
  account/users tái dùng global UI product.
- Return navigation chỉ nhận account và management users/course-categories/courses/
  classes; kiểm tra origin, đường dẫn chuẩn hóa, backslash/control cả dạng encode.
- Thêm API public `users/client.listAllActiveMentors(signal?)` cho class picker:
  role=MENTOR,status=ACTIVE,pageSize=100, đọc hết pagination và hủy request được.

## Prompt 2

| Route FE/adapter | Consumer/backend |
| --- | --- |
| `/login`, `/register` | Link navigation Google, lỗi Google disabled/callback |
| `/register/complete` | GET `/auth/registration-context`; POST `/auth/google/complete-registration` |
| GET `/api/v1/auth/google` | GET `/auth/google?returnTo=...`, fixed upstream và safe return path |
| GET `/api/v1/auth/google/callback` | GET `/auth/google/callback?code=...&state=...&error=...` |

Google dùng dedicated route adapters; generic proxy tiếp tục chặn redirect.
Start chỉ chấp nhận 302 đến HTTPS `accounts.google.com/o/oauth2/v2/auth` và scoped
state cookie. Callback chỉ chấp nhận APP_ORIGIN và trang login/onboarding hoặc
safeReturnTo management/account; không follow redirect upstream.

Cookie Google được forward theo đúng tên và path:

| Cookie | Path | Luồng |
| --- | --- | --- |
| `google_oauth_state` | `/api/v1/auth/google/callback` | Start response, callback request/clear |
| `registration_intent` | `/api/v1/auth` | Callback response, GET context, POST complete, complete clear |
| `access_token` | `/` | Session response sau callback/complete |
| `refresh_token` | `/api/v1/auth/refresh` | Session response; request chỉ refresh |

Dedicated adapter chỉ forward state cookie vào callback; không gửi access/refresh
hoặc cookie khác. Response cookies cần đúng Path, HttpOnly, SameSite=Lax, không
Domain hoặc scope attribute trùng, và Secure khi APP_ORIGIN HTTPS. OAuth failure
chuyển về login với mã lỗi cố định và clear state; không lộ payload upstream.
Google query phụ `scope`, `authuser`, `prompt` bị bỏ vì không thuộc callback DTO BE.
Các field callback hợp lệ có giới hạn và không được trùng.

Context prefill displayName/avatar Google HTTPS; email chỉ đọc. Complete payload
chỉ có displayName, phone nếu không rỗng và deviceName=`Mindy Web`. Không gửi
email/password/role/provider tokens. Kết quả session được đưa vào SessionProvider
và thông báo các tab. Intent quá hạn/đã dùng hiển thị hành động bắt đầu Google lại;
mutation failure giữ input, không refresh/replay intent hoặc tự retry network error.

Login, email verification, Google completion, refresh và logout/logout-all dùng cùng same-tab queue
và WebLock `mindy-auth-refresh`, tránh refresh cũ rotate/clear cookie của session
vừa tạo. SessionProvider generation chặn commit identity từ bootstrap cũ;
BroadcastChannel chỉ gửi login/logout và tab nhận đọc lại `/me`, không truyền token
hoặc lưu user vào browser storage.
Authenticated navigation callback thêm marker cố định `mindyAuth=google` vào trusted
destination sau khi nhận đủ cookie session hợp lệ. Bootstrap đọc User hợp lệ rồi
consume marker, giữ query/hash/history state còn lại và broadcast login một lần,
để các tab khác đọc lại account. Failure/onboarding không thêm marker này.

Existing Google user nhận session và về safe return path. User mới hoàn tất về
role home: BE service có `returnTo` nhưng controller complete chỉ trả
`{ user, accessTokenExpiresAt }`, context cũng không cung cấp returnTo. FE không
tự suy ra intent/server returnTo hoặc thêm field response chưa có.

## Cấu hình phải khớp để chạy Google thật

FE: API_BASE_URL trỏ BE `/api/v1`; APP_ORIGIN phải là URL origin mở frontend.
Dev/start script hiện dùng port 3002, còn env mẫu/local cũ có thể là 3001; chọn
origin thực tế và chỉnh env của môi trường tương ứng trước khi chạy. Agent không sửa env cá nhân; bước tích hợp cuối của root chỉ căn APP_ORIGIN
trong .env.local với portdev3002, giữ các cấu hình khác và không commit env.

BE và Google Cloud Console (ví dụ dùng frontend port 3002):

```dotenv
FRONTEND_BASE_URL=http://localhost:3002
GOOGLE_REGISTRATION_PATH=/register/complete
GOOGLE_AUTH_ERROR_PATH=/login
GOOGLE_REDIRECT_URI=http://localhost:3002/api/v1/auth/google/callback
GOOGLE_AUTH_ENABLED=true
# GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET: cấu hình OAuth web client ngoài repo
COOKIE_SECURE=false
```

Google OAuth authorized redirect URI phải chính xác là callback **frontend
adapter**, không callback BE port 3000. State cookie được đặt cho origin FE nên
callback cần đi qua cùng host/path. Production dùng HTTPS và COOKIE_SECURE=true.
GOOGLE_AUTH_SUCCESS_PATH có thể giữ `/`; FE start luôn gửi safe returnTo `/account`
khi không có next hợp lệ. Không thêm provider secret vào NEXT_PUBLIC env.

## Bằng chứng kiểm tra

- Pinned Node22.20.0 và pnpm12.6.0 qua Corepack cached `pnpm.mjs`.
- Scoped Biome auth/users/shared identity/auth route adapters và identity E2E:
  pass, không warning.
- 39 scoped unit tests pass: identity password/roles/status; public password;
  401 recovery,403 stop,422 không replay; Google DTO/avatar/context/intent;
  redirect/cookie/query policy và server adapter; đủ mentor pagination.
  Bao gồm deferred-refresh/onboarding/logout concurrency, logout recovery không
  nested lock và callback marker/cùng cross-tab WebLock.
- Full `tsc --noEmit` pass sau tích hợp. Root chạy lại build/quality gate cuối cùng.
- Đã thêm 3 mock identity browser scenarios ngoài 3 kịch bản cũ: Google link và
  auth fit1440/768/390/375; prefill/read-only email/đúng completion payload/session;
  expired intent recovery. Root chạy production build rồi combined E2E.
- Lần combined E2E đầu: original identity và Google onboarding/session pass;
  failure/expired assertions trùng Next route announcer đã scope về inline alert.
  Root chạy lại các scenarios sau sửa selector và session race.
- Mock adapter/unit và mock E2E không phải live Google/SMTP. Chưa xác minh live
  Google credentials, consent và callback trên môi trường thật; không đánh dấu
  live Google/email pass.

Root cập nhật contracts/architecture/progress và checklist prompt bằng kết quả
quality gate/E2E cuối cùng. Không push/merge/deploy trong phạm vi này.

## Kết quả kiểm tra tích hợp cuối

Root đã chạy production build rồi toàn bộ suite trên Node22.20.0/pnpm12.6.0:
Biome/boundaries/TypeScript,77unit tests và22Chromium E2E đều pass. Browser QA
có1440/768/390/375px, scroll/deep links/keyboard và ảnh product API mock.
Đây là bằng chứng thay thế trạng thái pending browser run ở các ghi chú agent
phía trên. Live backend/Google/SMTP vẫn chưa xác minh.
[Xem handoff cuối](./IMPLEMENTATION_PROMPTS_1_4.md).
