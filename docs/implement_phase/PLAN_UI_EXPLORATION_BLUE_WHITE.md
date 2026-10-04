# UI exploration — 5 mẫu xanh dương/trắng cho Mindy

## 1. Mục tiêu và trạng thái

Tạo **5 phương án giao diện để người dùng xem, so sánh và chọn**, ưu tiên nhiều
màu trắng kết hợp xanh dương, xanh da trời hoặc pastel. Mỗi phương án phải có khác
biệt dễ nhận ra về bố cục, đồng thời giữ ngôn ngữ thiết kế nhất quán giữa các trang.

**Trạng thái: đã triển khai UI exploration ngày 2026-10-02** trên branch frontend
`feat/ui-exploration-blue-white`, base `f674095`. Đủ 20 màn hình, fixture/local
interactions, responsive và bộ chọn mẫu tại `/ui-lab`.
[README bàn giao, link và 40 ảnh so sánh](../ui-exploration/README.md).
Chưa đưa mẫu nào vào route sản phẩm hoặc triển khai production.

Sau đó người dùng yêu cầu thêm 5 layout. Bộ 06–10 và URL được ghi tại README bàn
giao phía trên; UI Lab hiện có 10 mẫu/40 màn hình. Phạm vi chi tiết trong plan này
vẫn mô tả bộ đầu tiên 01–05. Lần bổ sung bỏ unit/E2E theo yêu cầu người dùng.

Đây là thử nghiệm UI độc lập với [implementation phases nghiệp vụ](./README.md).
Hoàn tất thử nghiệm không đồng nghĩa hoàn tất Phase 1/2 hoặc tích hợp API mới.

## 2. Phạm vi chính xác

| Nhóm trang người dùng yêu cầu | Màn hình cần dựng cho mỗi mẫu | Mục đích |
| --- | --- | --- |
| Trang chủ | Home | Giới thiệu Mindy, cách học, lợi ích và CTA |
| Login/register | Login và Register | Hai màn hình cùng nhận diện, form dễ đọc/dùng |
| Trang admin | Admin overview | Một trang tổng quan với navigation, summary và bảng dữ liệu minh họa |

Tổng cộng **5 bộ thiết kế × 4 màn hình = 20 màn hình preview**. Login/register được
tính là một nhóm chức năng nhưng vẫn cần cả hai màn hình, không chỉ thay tiêu đề form.

Admin trong thử nghiệm này là **trang tổng quan quản trị**, không mở rộng thành toàn
bộ module quản lý users/course/class/payment. Dữ liệu tổng quan là fixture để đánh
giá UI; chưa có dashboard API trong scope.

Phần được code:

- Bố cục, typography, palette, spacing, icon/illustration, responsive và UI states.
- Điều hướng giữa các màn hình cùng mẫu; đổi mẫu; menu mobile; hiện/ẩn password.
- Validation hiển thị và trạng thái submit mô phỏng của form.
- Filter/page cơ bản trên bảng fixture admin và state loading/empty/error.

Ngoài scope:

- Thêm endpoint, sửa DTO/auth/session, Google OAuth, reset password hoặc nghiệp vụ BE.
- Catalog detail, checkout, payment, học liệu, compiler, lớp học và các trang admin khác.
- Dashboard dữ liệu thật, biểu đồ cần thư viện mới, chức năng tạo/sửa/xóa tài khoản.
- Deploy production, merge giao diện được chọn vào nhánh chính hoặc xóa các mẫu còn lại.

## 3. Branch và cách bàn giao cho agent code

- Repository: `mindy-fe`; branch hiện tại lúc viết plan là `dev`.
- Tên branch đề xuất: **`feat/ui-exploration-blue-white`**; chỉ agent triển khai mới
  tạo/chuyển branch này. Cả năm mẫu nằm trong cùng branch để so sánh trực tiếp.
- Trước khi code, đọc `AGENTS.md`, architecture, API contracts, progress và plan này;
  kiểm tra branch/status. Chọn base FE có nền tảng hiện tại và bảo đảm plan có mặt
  trong checkout dùng để triển khai.
- Working tree lúc lập plan có nhiều thay đổi chưa commit, gồm compiler và tài liệu.
  Giữ nguyên công việc đó; không reset/clean/stash hoặc gom commit ngoài phạm vi UI.
  Nếu dùng checkout riêng, chuyển đúng tài liệu/baseline cần thiết trước khi làm.
- Commit chỉ các file thuộc UI exploration và tài liệu liên quan, theo Conventional
  Commits. Không tự merge, push hoặc deploy chỉ để trình bày preview.
- Chạy preview local từ branch thử nghiệm; báo lại branch, URL và hướng dẫn xem mẫu.

## 4. Cách mở và so sánh các mẫu

Tạo khu vực preview độc lập, không thay các route sản phẩm `/`, `/login`, `/register`
hoặc `/management/users` trong giai đoạn chọn thiết kế.

| URL mục tiêu | Nội dung |
| --- | --- |
| `/ui-lab` | Bộ chọn 5 mẫu, thumbnail, tên, mô tả ngắn và link mở từng mẫu |
| `/ui-lab/[variant]/home` | Trang chủ của mẫu |
| `/ui-lab/[variant]/login` | Login của mẫu |
| `/ui-lab/[variant]/register` | Register của mẫu |
| `/ui-lab/[variant]/admin` | Admin overview của mẫu |

Variant IDs cố định: `sky-blue`, `pastel-cloud`, `white-blueprint`, `azure-studio`,
`ice-minimal`. Chỉ nhận bốn view ở bảng; variant/view không hợp lệ trả not-found.

`/ui-lab` và thanh chọn mẫu là công cụ review, không tính là trang sản phẩm bổ sung.
Thanh review nhỏ, tách khỏi thiết kế, có:

- Chọn mẫu và chọn Home/Login/Register/Admin.
- Khi đổi mẫu, giữ loại màn hình đang xem; đổi view vẫn giữ variant.
- Nhãn “Bản xem thử · Dữ liệu minh họa” và lựa chọn UI state phù hợp màn hình.
- URL mở trực tiếp/reload được, không cần backend hoặc đăng nhập thật để review.
- Không giữ password hoặc form values khi chuyển mẫu; không lưu chúng vào storage.

Route preview có metadata noindex, không thêm link vào navigation sản phẩm chính.
Preview admin dùng fixture độc lập, không bypass AuthBoundary của route admin thật.

## 5. Nội dung và nguyên tắc chung

### 5.1 Nội dung nhất quán để so sánh

Home dùng cùng thông điệp chính ở cả năm mẫu:

- Brand: Mindy / Mindy Center theo asset hiện tại.
- Headline gợi ý: **“Học từng bước, tiến xa cùng Mindy.”**
- Mô tả: “Không gian học tập giúp bạn xây nền tảng, thực hành và tiến bộ cùng mentor.”
- CTA chính “Bắt đầu học” → register preview cùng mẫu.
- CTA phụ “Khám phá cách học” → section bên dưới; header có “Đăng nhập”.
- Ba lợi ích: lộ trình rõ ràng, thực hành chủ động, đồng hành cùng mentor.
- Cách học: chọn lộ trình → học và thực hành → nhận phản hồi.
- Một khu vực minh họa chủ đề học, CTA cuối và footer đơn giản.

Có thể đổi vị trí, trình bày và cách nhóm nội dung theo mẫu. Không bịa số lượng học
viên, cam kết đầu ra, đánh giá khách hàng hoặc đối tác như thông tin thật. Thẻ chủ
đề là nội dung minh họa, không mở thêm course detail hoặc yêu cầu catalog API.

### 5.2 Login và register

- Login: email, password, hiện/ẩn password, submit và link sang register cùng mẫu.
- Register: họ tên, email, số điện thoại tùy chọn, password, submit và link login.
- Bám field hiện có; không thêm role picker, OTP, Google hoặc điều khoản chưa có nội dung.
- Trạng thái: default, focus, field error, submitting và notice mô phỏng.
- Submit hợp lệ chỉ chạy mô phỏng ngắn, báo rõ “Đây là bản xem thử, chưa gửi dữ liệu”.
  Không gọi API, gửi email, tạo tài khoản hoặc tự mở session giả.
- Password dùng input phù hợp, hỗ trợ paste/password manager và label đầy đủ.
- Form register được phép dài hơn login; không ép mọi field vào một viewport hoặc
  cắt phần submit trên màn hình thấp.

### 5.3 Admin overview

Dùng cùng một fixture deterministic cho năm mẫu để so sánh bố cục công bằng:

- Tên trang “Tổng quan quản trị”; lời chào và ngày mẫu cố định.
- Bốn summary: học viên, mentor, lớp đang mở, lịch học hôm nay. Đây là số minh họa,
  không được tính từ `GET /admin/users` hoặc giả làm KPI production.
- Bảng người dùng gần đây: tên, email `example.com`, vai trò, trạng thái và ngày tạo.
- Khối lịch hôm nay và/hoặc ghi chú vận hành, tối đa hai khối phụ.
- Filter role/status và pagination thao tác trên fixture local; dùng tập dữ liệu đủ
  để thao tác có kết quả, reset về trang 1 khi đổi filter.
- Navigation chỉ có overview hoạt động trong preview. Nếu cần nhãn menu tương lai
  để minh họa layout, dùng trạng thái chưa khả dụng, không tạo link chết hoặc route mới.
- Không dùng nút “Tạo user”, thu tiền hoặc thao tác dữ liệu thật chỉ để lấp chỗ trống.

### 5.4 Visual baseline

- White/off-white là nền chính; xanh dương dùng cho brand, CTA và các mảng nhấn.
- Màu pastel dùng làm surface/decorative accent; nội dung và CTA dùng xanh đậm đủ rõ.
- Dùng một font stack hỗ trợ tiếng Việt theo baseline repo; phân biệt mẫu bằng size,
  weight và rhythm, không cần tải năm font ngoài.
- Body khoảng 15–16px; form input tối thiểu 16px trên mobile; hero responsive khoảng
  36–64px tùy mẫu; độ dài mỗi dòng headline có chủ đích.
- Public max-width khoảng 1200px; admin có thể 1440px. Mobile gutter 16–20px.
- Cùng hệ icon stroke; illustration ưu tiên CSS/SVG local, không phụ thuộc ảnh remote.
- Motion nhẹ 120–200ms cho hover/menu, hỗ trợ reduced motion; không autoplay carousel.
- Không biến cả năm mẫu thành cùng một hero/card grid chỉ đổi màu.

## 6. Năm phương án thiết kế

### Mẫu 01 — Sky Blue / Sáng và dễ tiếp cận

**Ý tưởng:** xanh da trời và trắng, cảm giác rõ ràng, thân thiện với học viên mới.

| Token | Màu |
| --- | --- |
| Background / surface | `#F7FCFF` / `#FFFFFF` |
| Primary / hover | `#0369A1` / `#075985` |
| Soft accent / border | `#E0F2FE` / `#CDE7F5` |
| Text / muted | `#102A43` / `#52657D` |

- Home: header trắng; hero **hai cột 55/45**, copy bên trái, minh họa các thẻ bài học
  xếp lớp bên phải. Bên dưới là ba lợi ích và section cách học ngang. Nền xanh nhạt
  ở một số section; white/off-white khoảng 75% diện tích.
- Login/register: **chia 45/55**, panel hình minh họa nền sky bên trái, form trắng
  bên phải; form không bọc thêm quá nhiều card. Mobile ẩn phần art lớn, giữ brand/copy.
- Admin: **sidebar trắng 240px**, active item nền sky; topbar trắng; bốn summary
  ngang, bảng chiếm 2/3 và lịch bên phải 1/3. Mobile sidebar thành drawer.
- Hình khối: radius 16–20px, border nhẹ, shadow mỏng; không dùng mảng navy lớn.
- Dấu hiệu nhận diện: hero lệch trái + lesson-card illustration + navigation sáng.

### Mẫu 02 — Pastel Cloud / Nhẹ và mềm

**Ý tưởng:** pastel blue với khoảng thở lớn, thân thiện nhưng form vẫn rõ tương phản.

| Token | Màu |
| --- | --- |
| Background / surface | `#F5F8FF` / `#FFFFFF` |
| Primary / hover | `#315BB5` / `#254790` |
| Soft accent / border | `#E8EFFF` / `#D8E2F3` |
| Text / muted | `#1C2D4A` / `#58677D` |

- Home: **hero centered**, headline rộng vừa, hai CTA ở giữa; phía dưới là grid
  bất đối xứng gồm một thẻ cách học lớn và các thẻ lợi ích nhỏ. Dùng hình mây/vòng
  tròn mờ làm nền phụ, không phủ sau đoạn text dài. White/off-white khoảng 80%.
- Login/register: **một card chính giữa**, nền pastel thoáng, brand bên trên;
  login card khoảng 440px, register khoảng 520px. Dưới form chỉ một dòng chuyển trang.
- Admin: **top navigation ngang**, không sidebar desktop; summary dạng pill-card,
  vùng bảng và lịch là hai panel bo tròn; tablet/mobile menu thu gọn.
- Hình khối: radius 24–28px, shadow mềm có tiết chế, khoảng cách section rộng.
- Dấu hiệu nhận diện: centered composition + pastel surfaces + admin top navigation.

### Mẫu 03 — White Blueprint / Trắng và có cấu trúc

**Ý tưởng:** nhiều trắng, xanh royal dùng ít nhưng rõ; cảm giác học thuật và gọn gàng.

| Token | Màu |
| --- | --- |
| Background / surface | `#FFFFFF` / `#F8FAFF` |
| Primary / hover | `#1D4ED8` / `#1E40AF` |
| Soft accent / border | `#EFF6FF` / `#D8E1EF` |
| Text / muted | `#172554` / `#53627A` |

- Home: **bố cục editorial lệch trái**, headline lớn, eyebrow nhỏ, đường kẻ mảnh
  chia section. Lợi ích trình bày thành các hàng đánh số thay vì card nổi; một dải
  minh họa lộ trình chạy ngang. White/off-white khoảng 90%.
- Login/register: **form bên trái 40%, câu chuyện bên phải 60%**, ngăn bằng đường
  kẻ; không panel màu đậm hoặc card đổ bóng. Mobile đưa form lên trước và rút gọn story.
- Admin: **sidebar hẹp khoảng 208px**, navigation text/icon gọn; stats thành dải số
  chia bằng đường kẻ, bảng rộng là nội dung trung tâm; lịch nằm bên dưới bảng.
- Hình khối: radius 6–8px, border sắc nét, gần như không shadow; typography tạo hierarchy.
- Dấu hiệu nhận diện: nhiều whitespace + numbered rows + bảng admin ưu tiên mật độ đọc.

### Mẫu 04 — Azure Studio / Năng động và nổi bật

**Ý tưởng:** một mảng xanh rõ ràng tạo nhận diện, phần nội dung còn lại vẫn trắng thoáng.

| Token | Màu |
| --- | --- |
| Background / surface | `#F8FAFF` / `#FFFFFF` |
| Primary / hover | `#1D4ED8` / `#1E40AF` |
| Hero blue / soft accent | `#1E40AF` / `#DBEAFE` |
| Text / muted / border | `#142D4E` / `#53657D` / `#D9E3F2` |

- Home: **hero xanh full-width**, chữ trắng, headline lớn và minh họa hình học ở
  cạnh; CTA trắng chữ xanh. Nội dung chuyển sang nền trắng với các hàng copy/visual
  xen kẽ; mảng xanh giới hạn khoảng 30–35% toàn trang, không biến thành dark theme.
- Login/register: **split 50/50**, brand statement nền azure bên trái và form trắng
  bên phải. Register giữ form đầy đủ và cho trang scroll tự nhiên.
- Admin: **sidebar xanh khoảng 224px**, content trắng; summary đầu trang và bảng/lịch
  bố trí dưới. Sidebar dùng text trắng và active state dễ nhận, không đổi toàn content xanh.
- Hình khối: radius 12–16px, CTA mạnh, shadow chỉ ở phần cần nổi; illustration khối rõ.
- Dấu hiệu nhận diện: hero xanh rộng + white CTA + sidebar admin có màu.

### Mẫu 05 — Ice Minimal / Tinh gọn và yên tĩnh

**Ý tưởng:** trắng lạnh, xanh băng rất nhạt và nhấn petroleum blue; nội dung ít nhưng rõ.

| Token | Màu |
| --- | --- |
| Background / surface | `#FAFDFE` / `#FFFFFF` |
| Primary / hover | `#075985` / `#0C4A6E` |
| Soft accent / border | `#ECF8FC` / `#DCEAF0` |
| Text / muted | `#163344` / `#526873` |

- Home: **hero một cột căn trái, không illustration nổi cạnh headline**; dưới copy
  và CTA là một dải “hành trình học” rộng. Các bước trình bày thành timeline dọc,
  thẻ chủ đề ở cuối, chỉ một section nền ice. White/off-white khoảng 90%.
- Login/register: **form phẳng không card**, nằm trong khung nội dung hẹp dưới header
  tối giản; desktop có cột trợ giúp ngắn bên cạnh, mobile bỏ cột phụ. Không panel art lớn.
- Admin: **topbar + navigation tabs**, summary nhỏ gọn; bảng người dùng ở trái và
  cột lịch/ghi chú hẹp bên phải, ít khung card. Mobile tabs cuộn trong vùng riêng.
- Hình khối: radius 10–12px, border nhẹ, hầu như không shadow; spacing đều và copy ngắn.
- Dấu hiệu nhận diện: hành trình dọc + form phẳng + admin ít khung bao.

## 7. Tổ chức triển khai đề xuất

Tiếp tục dùng Next.js/React/TypeScript strict, CSS hiện tại và module boundaries.
Đặt composition tại app; preview UI thuộc feature riêng có consumer thật:

```text
src/app/(ui-preview)/ui-lab/
  page.tsx                       bộ chọn mẫu
  [variant]/[view]/page.tsx       resolve route và compose preview
src/features/ui-exploration/
  client.ts                      public entry cho interactive preview
  components/                    toolbar, forms, table, navigation dùng chung
  variants/                      layout Home/Auth/Admin riêng theo 5 hướng
  data/                          fixture local cho preview
  styles/                        CSS Modules + tokens scoped theo variant
```

Cấu trúc là đề xuất; chỉ tạo file khi có consumer. Một mẫu có thể dùng chung Auth
layout cho login/register, nhưng field/state của hai form phải khác đúng scope.

- Reuse Brand/Icon và primitive phù hợp từ shared. Không import private components
  của auth/users hoặc sửa boundary script chỉ để tái dùng code tùy tiện.
- Không mount LoginForm/RegisterForm thật trong UI lab nếu chúng gọi API hoặc redirect
  theo session; tạo presentation preview với local state và fixture riêng.
- Tokens có ý nghĩa như `--preview-primary`, `--preview-bg`, `--preview-text`,
  `--preview-border`, `--preview-radius`; scope dưới wrapper variant và CSS Modules.
- Không đổi `:root` hoặc các biến `--green`/`--paper` của sản phẩm để làm mẫu thử;
  không để selector của một mẫu ảnh hưởng bốn mẫu còn lại hoặc trang thật.
- Chia sẻ field/button/table primitives; cho phép layout thực sự khác nhau. Tránh
  một component khổng lồ với hàng chục nhánh điều kiện theo variant.
- Fixture chỉ được preview feature import; không đi vào shared API, auth session
  hoặc production data client. Không thêm UI/chart/state dependency nếu CSS/React đủ.

## 8. Task triển khai cho agent tiếp theo

| Task | Việc làm | Acceptance |
| --- | --- | --- |
| UI-01 | Chuẩn bị branch/base, đọc conventions, kiểm tra existing changes | Code UI nằm đúng branch thử nghiệm, không gom sửa đổi ngoài scope |
| UI-02 | Tạo preview route, registry 5 variants/4 views và toolbar | Direct URL/reload được, đổi mẫu giữ view, invalid ID có not-found |
| UI-03 | Tạo nội dung/fixture chung và presentation primitives | Không request nghiệp vụ BE; form/table/menu có local interaction |
| UI-04 | Dựng Sky Blue đầy đủ Home/Login/Register/Admin | Đủ 4 màn hình responsive, không chỉ Home |
| UI-05 | Dựng Pastel Cloud đầy đủ 4 màn hình | Centered layout/top navigation đúng hướng |
| UI-06 | Dựng White Blueprint đầy đủ 4 màn hình | Editorial/ruled layout, admin table-first |
| UI-07 | Dựng Azure Studio đầy đủ 4 màn hình | Hero/sidebar xanh, content chính vẫn sáng |
| UI-08 | Dựng Ice Minimal đầy đủ 4 màn hình | Timeline/form phẳng/minimal admin |
| UI-09 | Polish states, responsive, accessibility và CSS isolation | 5 mẫu nhìn khác nhau, mọi form đủ state, trang thật không bị ảnh hưởng CSS |
| UI-10 | Visual review, checks, ảnh so sánh và cập nhật progress | Có bằng chứng cho cả 20 màn hình và hướng dẫn chọn mẫu |

Hoàn thành từng mẫu trên cả ba nhóm trang trước khi tuyên bố mẫu đã xong. Có thể
làm scaffold chung trước, nhưng không để cuối cùng mới bổ sung login/register/admin.

## 9. Kiểm tra và tiêu chí nghiệm thu

### 9.1 Visual và responsive

- Xem cả 20 màn hình ở desktop khoảng 1440px và mobile khoảng 390px; kiểm tra thêm
  375px để phát hiện overflow và tablet khoảng 768px cho navigation/grid.
- Chụp một ảnh desktop và mobile cho mỗi màn hình: **40 ảnh chính**, cùng viewport,
  fixture và trạng thái default. Có thể ẩn toolbar review khi chụp, không ẩn nhãn
  dữ liệu minh họa ở nơi cần để hiểu nội dung.
- Kiểm tra screenshot bằng mắt: heading/CTA nổi bật, độ dài text tiếng Việt, form
  register không bị cắt, layout cân đối, không overflow body.
- Bảng admin rộng có container scroll riêng hoặc chuyển row thành card mobile;
  không giảm font quá nhỏ để nhét toàn bộ bảng.
- Text/CTA phải đủ contrast; pastel chỉ là nền nhấn. Kiểm tra thực tế từng pair sau
  khi code, gồm hover/focus/error; không mặc định palette đẹp là đã đạt accessibility.
- Focus thấy được, label đúng, drawer dùng được bằng keyboard và đóng bằng Escape;
  input/button chính có vùng chạm khoảng 44px, reduced motion được tôn trọng.

### 9.2 UI states và checks

- Mỗi variant có login/register default, validation error, submitting và demo notice.
- Admin có default/loading/empty/error, filter/page và drawer/mobile navigation.
- State picker chỉ trong toolbar review và chỉ có states phù hợp view; không tạo
  toggle kỹ thuật trong giao diện sản phẩm mockup.
- Chạy `pnpm check` và browser E2E liên quan theo tooling repo; ghi rõ runtime nếu
  không chạy được bản Node/pnpm đã pin. Không tự thay package versions để vượt gate.
- E2E tập trung vào route navigation, đổi variant/view, form demo, table/menu và
  việc preview không gửi request auth/management. Không viết test cho từng màu CSS.
- Smoke các route thật `/`, `/login`, `/register` và management trong test harness
  để phát hiện ảnh hưởng CSS/layout; không chạy mutation trên tài khoản thật.
- Đây là visual/UI review, không phải live auth/payment integration acceptance.

### 9.3 Checklist hoàn tất

- [x] Có branch FE thử nghiệm riêng và ghi đúng base/revision.
- [x] Có 5 hướng thiết kế khác nhau rõ ràng, chủ đạo xanh dương/trắng.
- [x] Mỗi hướng có Home + Login + Register + Admin overview: đủ 20 màn hình.
- [x] Palette/layout/typography nhất quán giữa các trang trong cùng một hướng.
- [x] Có URL riêng và bộ chọn mẫu giữ view để so sánh nhanh.
- [x] Nội dung/fixture nhất quán, demo data được nhận biết rõ.
- [x] Form/table/menu có interaction và states phù hợp, không gọi API nghiệp vụ.
- [x] Mobile/desktop/keyboard/contrast được review; không overflow body.
- [x] CSS/fixture preview được cô lập với sản phẩm và các mẫu khác.
- [x] Checks phù hợp pass; có 40 ảnh so sánh và ghi chú ưu/nhược từng mẫu.
- [x] README bàn giao và `docs/progress.md` cập nhật trạng thái thử nghiệm.
- [x] Chưa tự chọn mẫu thay người dùng hoặc merge/deploy giao diện mới.

## 10. Kết quả agent code cần bàn giao

1. Tên branch, cách chạy local và link `/ui-lab`.
2. Danh sách link trực tiếp 5 mẫu; mỗi mẫu đủ bốn view.
3. Ảnh desktop/mobile có tên ổn định, ví dụ
   `sky-blue-home-desktop.png`, `sky-blue-register-mobile.png`.
4. Bảng so sánh ngắn về cảm giác, white/blue balance, ưu điểm Home/Auth/Admin và
   điểm cần cân nhắc; có thể đề xuất mẫu phù hợp nhất nhưng giữ cả năm để user chọn.
5. Kết quả checks và giới hạn còn lại; không ghi “tích hợp API hoàn tất” cho UI mock.

Khi người dùng chọn mẫu, việc đưa thiết kế đó vào route sản phẩm và nối dữ liệu
thật là một task tiếp theo, sử dụng API/permission contract hiện hành.

## 11. Prompt bàn giao có thể dùng ngay

> Trong repository frontend mindy-fe, triển khai kế hoạch
> `docs/implement_phase/PLAN_UI_EXPLORATION_BLUE_WHITE.md` trên branch thử nghiệm
> riêng `feat/ui-exploration-blue-white`, sau khi kiểm tra và giữ nguyên công việc
> đang có trong working tree. Dựng đủ 5 bộ Sky Blue, Pastel Cloud, White Blueprint,
> Azure Studio và Ice Minimal. Mỗi bộ có Home, Login, Register và Admin overview,
> ưu tiên xanh dương/trắng và khác bố cục rõ ràng. Dùng các route /ui-lab để so sánh,
> fixture/local interactions cho preview; không nối thêm API hoặc đổi nghiệp vụ.
> Bám AGENTS.md, module boundaries và CSS isolation. Hoàn tất responsive/states,
> visual review, checks phù hợp và bàn giao link/ảnh so sánh cả năm mẫu. Chưa merge,
> push hoặc deploy khi chưa có yêu cầu tiếp theo.
