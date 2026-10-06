> Cập nhật UI 06/10/2026: giao diện Mindy mới theo UI.md, bỏ UI Learnthru/Ocean cũ. Theme toàn dự án tại shared/config/theme.ts; giữ API và logic nghiệp vụ.

# Frontend architecture

## Phạm vi

Mindy FE là Next.js App Router, React, TypeScript strict và pnpm. NestJS sở hữu
database, JWT/session, quyền truy cập và transaction nghiệp vụ. FE dùng React Hook
Form + Zod cho input, Biome cho style/lint, Vitest và Playwright cho kiểm thử.
CSS dùng design tokens và các component chung; chưa thêm UI framework khi chưa cần.

## Cấu trúc

```text
src/
  app/                  routes, layout, composition, API adapter
    _components/        shell ghép auth + navigation
    _providers/         composition của context providers
    (public)/           landing, catalog, public class and course unit viewer
    (auth)/             login, register, verify-email, Google onboarding
    (protected)/        account, management, student cart/checkout/orders
    api/v1/[...path]/    allowlisted NestJS JSON adapter
    api/v1/auth/google/  dedicated trusted OAuth navigation/callback
  features/
    auth/               session, login, role presentation, recovery
    users/              list, create, detail, status
    catalog/            admin categories/courses/units and active course picker
    classes/            admin class/schedule/lifecycle with snapshot units
    cart/               student cart and public class AddToCartButton
    orders/             checkout, own orders and unknown-result recovery
    compiler/           local JavaScript playground and separate runner adapter
    home/               landing content and scoped GSAP motion
    payments/           PayOS API and reconciliation
    learning/           private class viewer
  shared/
    api/contracts/      schema API dùng chung giữa auth và users
    components/         feedback, management primitives and UnitWorkspace
    config/             typed server env and global Mindy theme
    lib/                HTTP và date formatting
    ui/                 icon, brand, avatar, role/status display
tests/e2e/              user journeys với API mô phỏng
scripts/                module boundary check
```

`app -> features -> shared`. Approved cross-feature client dependencies:
`users -> auth/client`, `catalog -> auth/client, cart/client`,
`classes -> auth/client, catalog/client, users/client`, `cart -> auth/client`, và
`orders -> auth/client, cart/client, payments/client`, `payments -> auth/client`,
`learning -> auth/client`. Catalog dùng public AddToCartButton của cart;
orders đọc cart và gửi thông báo invalidation không chứa dữ liệu cá nhân. Classes dùng public picker
API từ catalog/users để đọc toàn bộ active courses/mentors; không import private
feature code. Auth không phụ thuộc ngược. Script check-boundaries.mjs áp đúng các
entrypoint này; các dependency khác vẫn bị từ chối. Shared identity contract có
consumer auth/users và class picker. Shared management styles và UnitWorkspace
có consumer catalog/classes.
Component của một feature dùng ở nhiều route vẫn ở trong feature.

Thiết kế Mindy mới dùng Geist local cho nội dung, Nunito Variable local cho header public và theme typed tại shared/config/theme.ts.
Root layout phát CSS variables; globals.css tạo màu dẫn xuất; CSS Modules chỉ dùng
token. Logo và palette lấy từ docs, mascot phục vụ từ public/mindy.
MindyAdminShell dùng sidebar + workspace, hồ sơ trong topbar. PublicShell và
AppShell cho student giữ header/navigation; AuthPage dùng intro + form trong 100dvh, mobile ẩn intro, màn hình thấp dùng form hai cột. Form cuộn cục bộ khi lỗi hoặc bàn phím làm thiếu chiều cao, không tràn trang.
HomeContent có GSAP scoped/reduced-motion, FeaturedCourses dùng GET /courses
qua adapter catalog; app ghép hai feature bằng ReactNode, không thêm dependency
chéo. UI preview cũ đã gỡ, các URL lịch sử redirect về /.

Course management units và class units/sessions dùng shared UnitWorkspace:
rail 300px và content minmax(0,1fr), mỗi vùng scroll riêng, chiều cao theo viewport
và vị trí workspace, min-height/min-width 0, vùng scroll hỗ trợ keyboard. Mobile
≤850px hoặc workspace thực tế ≤640px dùng native modal drawer (Escape/focus trap/return focus); selection thay
đổi đóng drawer. Feature giữ unit selection trên URL, hỗ trợ reload/history và
unavailable state. Course fields ở tab riêng, class fields thu gọn mặc định.
Ảnh Coursera vẫn được lưu trong repo. Public unit viewer dùng cùng workspace,
chọn bằng path `/courses/:courseId/units/:unitId` và kiểm tra membership trong
course DTO. Đây là syllabus public; learning/progress riêng vẫn chờ APIs BE.
[Context và8 prompt](./implement_phase/PROMPTS_BACKEND_INTEGRATION.md).

Feature xuất `client.ts`; chỉ thêm `server.ts` khi có consumer server thật. Code server
chứa secrets phải đánh dấu `server-only`. Không export chung server và client từ một barrel.

## Rendering và session

- Route landing compose ở server; HomeContent motion và FeaturedCourses tương tác ở client.
- Các trang được bảo vệ chỉ lấy dữ liệu cá nhân sau khi bootstrap session hoàn tất.
- Backend kiểm tra authentication, role và ownership trên mỗi endpoint. AuthBoundary
  chỉ điều khiển UX, không phải ranh giới bảo mật duy nhất.
- Không cache response cá nhân. Không lưu user/token vào localStorage.
- Product cart/checkout/orders chỉ đọc sau session STUDENT hợp lệ; component dữ
  liệu private được key theo userId và hủy request khi unmount. Không giữ cart/order
  trong sessionStorage hoặc provider cache. Payload-free cart-change event yêu cầu
  từng consumer đọc lại giỏ của phiên hiện hành.
- Browser giữ cookie HttpOnly do NestJS phát hành qua adapter cùng origin.
- Access cookie `Path=/`; refresh cookie `Path=/api/v1/auth/refresh`.
- Bootstrap gọi `/auth/me`; nếu 401 thì khôi phục phiên rồi đọc tiếp.
- Một tab dùng shared recovery Promise và queue cho thao tác session; các tab
  dùng cùng WebLock cho login/verify/Google complete/callback finalization/refresh/logout để cookie không
  bị response cũ ghi đè. Sau khi lấy recovery lock, đọc `/me`
  lần nữa để tránh rotate token đã được tab khác đổi. Browser không hỗ trợ Web Locks
  chỉ có bảo vệ trong một tab; deployment cần browser hiện đại trên HTTPS/localhost.
- Không retry login sai mật khẩu, lỗi 403 hoặc mutation thất bại do mạng.
- Chỉ replay một lần khi backend trả `AUTHENTICATION_REQUIRED` từ guard trước mutation.
- Provider bind identity/generation trong memory trước khi render private UI.
  Authenticated mutations giữ session lock qua `/auth/me`, kiểm tra đúng principal
  và request nghiệp vụ; account/generation thay đổi thì dừng và reload, không replay
  dưới account mới. Recovery trong lock dùng helper riêng để không lấy lock lồng nhau.
- Google GET callback chỉ redirect sang trang FE; trang đó bỏ code/state khỏi URL
  và gọi POST finalization một lần dưới session lock. Adapter POST exchange với BE,
  kiểm tra Origin/redirect/cookies rồi mới trả session cookies và local redirect.
- Logout/login/Google onboarding thông báo các tab qua BroadcastChannel. Existing
  Google callback dùng marker cố định; provider xóa marker sau bootstrap identity
  hợp lệ và gửi thông báo login để tab khác reload, giữ params/hash/history state.
- Intent logout phân biệt với missing/expired session: logout chuyển login không
  mang return path private cũ; session expiry giữ route/query/hash an toàn để quay
  lại sau login. Public header giữ query filters/unit selection trong return path.

Chưa thêm fetch dữ liệu cá nhân trong Server Components. Nếu thêm, phải forward access
cookie tới backend tin cậy, dùng no-store và thiết kế đường phục hồi ở browser; request
trang thông thường không nhận refresh cookie có path hẹp.

## HTTP adapter

API_BASE_URL trỏ cố định tới NestJS; path và method phải nằm trong allowlist.
Mutation phải có Origin khớp APP_ORIGIN. Không proxy URL tùy ý, authorization headers,
cookie ngoài policy, hoặc redirect từ upstream qua generic JSON proxy. Giữ Set-Cookie riêng biệt, body tối đa
32 KiB và timeout upstream 10 giây. Không ghi log token, password hoặc cookie.

Server env được kiểm tra ở request boundary, không đóng cứng API URL vào client bundle.
Thiếu/sai env trả lỗi cấu hình chung, không lộ chi tiết. Khi thêm endpoint mới, bổ sung
allowlist và kiểm thử contract tương ứng. PUT chỉ mở cho reorder course units;
DELETE chỉ mở cho `me/cart/items/:classId`. Public browse và student cart/orders
được allowlist theo đúng controller hiện tại. Endpoint upload tương lai cần policy riêng;
không tăng giới hạn payload identity để chuyển file qua đây.

## State và API types

- Session: auth context; form: React Hook Form; filter/page: URL.
- Dữ liệu users: request theo route/filter, hủy request cũ khi chuyển trang.
- Identity/catalog/classes/payment schemas theo backend Feat/Webhooktest @5c9e581.
- Form payload tách response; phone rỗng được bỏ khỏi create payload.
- Datetime JSON là string; hiển thị múi giờ Asia/Ho_Chi_Minh.
- Types hiện được quản lý bằng Zod schemas đối chiếu controller/DTO/source @5c9e581.
  Chưa thêm generated OpenAPI; DTO admin password đã khớp 12–128, không còn mismatch cũ.

## Quy ước

Trước khi tạo hoặc sửa UI, đọc và tuân theo [quy tắc UI sản phẩm](./ui-rules.md).
Đây là chuẩn thiết kế cho chức năng mới; nguồn tham khảo và phạm vi preview/sản phẩm
được mô tả trong tài liệu đó.

File kebab-case; component PascalCase; type public rõ ràng; dùng import type khi phù hợp.
Chỉ tạo shared abstraction khi có consumer thật. Test có `.spec.ts`, đặt cạnh source.
Commit theo Conventional Commits. Chạy `pnpm hooks:install` sau khi clone để bật pre-commit;
CI vẫn là quality gate độc lập. Mỗi thay đổi cập nhật progress và tài liệu liên quan.

## Phase 2.2 integration

Payments owns the Payment schema, create/reuse API and ADMIN review UI. Learning owns
the private StudentClass schema, read client and unit workspace. Order list/checkout
retain Order; detail uses OrderDetail with required nullable payment. Public/admin
course responses include nullable imgUrl. Schemas match BE 5c9e581.

Private routes: `/learning/classes/[classId]` and
`/management/payments/reconciliation`. Private components are keyed by principal and
abort reads/mutations on unmount. No private browser storage. Order detail serializes
reads, polls pending every 5 seconds while visible and revalidates on visibility
return. A failed creation requires read recovery before deliberate retry on the same
order. Checkout still only creates the order; PayOS link creation is a separate action.

Learning includes timetable/units/private meeting URLs; it has no inferred progress.
Reconciliation shows review events rather than all payments and cannot manually grant
access/refund/resolve review. Backend alone decides settlement and access.

`scripts/payment-fixture-smoke.mjs` exercises FE BFF with real cookie guards and the
companion backend HTTP fixture. It requires a disposable local database named
`mindy_fe_phase22_*test`; the backend fixture resets only its derived `_http_test`
database. Build BE and FE first, pass TEST_DATABASE_URL for the disposable container,
then run the script. Never point this script at application/VPS databases.
