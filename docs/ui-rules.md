# Quy tắc UI Mindy — Ocean Editorial

Đây là tài liệu bắt buộc đọc trước khi tạo chức năng có giao diện, thêm trang,
component hoặc sửa UI trong Mindy FE. Giao diện chuẩn là **Ocean Editorial
(mẫu 07)**, được chọn ngày 02/10/2026. Các chức năng mới phải tiếp nối giao diện này.
Yêu cầu cụ thể mới của người dùng được ưu tiên; nếu thay đổi quy tắc chung,
cập nhật tài liệu này trong cùng thay đổi để các lần sau dùng thống nhất.

## 1. Nguồn tham khảo và phạm vi

Tham khảo màn hình gần chức năng mới nhất trước khi viết UI:

| Chức năng | Màn hình chuẩn | Source tham khảo |
| --- | --- | --- |
| Trang giới thiệu/học tập | `/ui-lab/ocean-editorial/home` | `variants/home-variants.tsx` |
| Danh sách khóa học/sản phẩm | `/ui-lab/ocean-editorial/courses` | `variants/courses-page.tsx` |
| Giỏ hàng/tóm tắt đăng ký | `/ui-lab/ocean-editorial/cart` | `variants/cart-page.tsx` |
| Form đăng nhập/đăng ký | `/ui-lab/ocean-editorial/login`, `/ui-lab/ocean-editorial/register` | `variants/auth-variants.tsx`, `components/preview-form.tsx` |
| Quản trị/bảng dữ liệu | `/ui-lab/ocean-editorial/admin` | `variants/admin-variants.tsx`, `components/admin-content.tsx` |

Source trong bảng nằm dưới `src/features/ui-exploration/`.
Ảnh desktop/mobile đã duyệt nằm tại [screenshots](./ui-exploration/screenshots/).
Xem [hướng dẫn preview](./ui-exploration/README.md) để mở/chụp lại giao diện.

Ocean Editorial đã được áp dụng cho các route sản phẩm auth, quản trị,
catalog, giỏ hàng, checkout và orders trong Prompts 1–8. UI Lab tiếp tục là nguồn
tham khảo thiết kế. Với chức năng mới, giữ cùng chuẩn và hoạt động của auth,
quyền và API hiện có.
Fixture, giá minh họa, thanh review và hành vi submit giả của UI Lab chỉ phục vụ
preview; không đưa chúng vào luồng sản phẩm thật.

## 2. Định hướng thị giác

- Nền sáng, nhiều khoảng trắng, xanh biển làm màu nhận diện; chữ xanh đậm dễ đọc.
- Bố cục mang cảm giác tạp chí: tiêu đề lớn, nhãn mục nhỏ, đường kẻ mảnh,
  các khối nội dung có thứ bậc rõ ràng và số thứ tự khi có ý nghĩa.
- Dùng bố cục bất đối xứng cho phần giới thiệu và cột phụ; phần thao tác cần gọn,
  rõ và dễ quét thông tin. Không bắt mọi trang nghiệp vụ có hero lớn.
- Ưu tiên đường kẻ và khoảng cách để phân nhóm. Không bọc mọi nội dung trong card.
- Không tự đổi sang dark theme, gradient rực, neon, hiệu ứng kính, bóng đổ nặng
  hoặc card bo tròn lớn. Các mẫu UI đã loại bỏ không phải nguồn thiết kế.
- Panel xanh đậm được dùng có mục đích, như mục lục nổi bật hoặc khóa học gợi ý;
  nội dung còn lại vẫn lấy nền trắng làm chủ đạo.

## 3. Màu và tokens

Giá trị chuẩn hiện nằm ở `.root` trong
`src/features/ui-exploration/styles/exploration.module.css`:

| Vai trò | Token hiện tại | Giá trị |
| --- | --- | --- |
| Màu chính, CTA, link | `--preview-primary` | `#164e73` |
| Hover màu chính | `--preview-hover` | `#123b59` |
| Nền trang | `--preview-bg` | `#ffffff` |
| Nền phụ, khối tóm tắt | `--preview-soft` | `#eaf4fb` |
| Chữ chính | `--preview-text` | `#183246` |
| Chữ phụ | `--preview-muted` | `#536776` |
| Đường kẻ, viền input | `--preview-border` | `#d8e5ee` |
| Bo góc cơ sở | `--preview-radius` | `3px` |
| Bóng nhẹ khi cần | `--preview-shadow` | `0 12px 40px #07598509` |

Dùng token cho các vai trò trên, không tạo nhiều mã màu gần giống nhau.
Trên nền xanh đậm, dùng chữ trắng; focus phải đủ nổi bật, có thể dùng
`--preview-focus: #fff` như panel mục lục hiện tại.

Artwork khóa học có ba phối màu phụ giới hạn:

| Phối màu | Nền | Màu hình/chữ |
| --- | --- | --- |
| Blue | `#e5f0f9` | `#164e73` |
| Sand | `#f4eee2` | `#665532` |
| Mint | `#e7f1ec` | `#2d6251` |

Màu lỗi hiện có: viền `#b94444`, chữ `#a72d31`, nền `#fffafa`.
Màu trạng thái phải đi kèm chữ/icon; không dùng màu làm dấu hiệu duy nhất.

## 4. Typography và nội dung

- Font hiện tại: `"Avenir Next", "Segoe UI", Arial, sans-serif`.
  Giữ cùng font stack, hỗ trợ đầy đủ dấu tiếng Việt; không tự thêm font khác.
- Body cơ sở `15px`, line-height `1.6`; đoạn giới thiệu `15–16px`, line-height
  `1.8–1.9`. Nội dung cần đọc liên tục ưu tiên `14–16px`.
- Tiêu đề hero `40–66px` theo viewport, line-height khoảng `1.1–1.14`,
  weight `650`; có thể nhấn một cụm bằng màu primary, không dùng italic.
- Tiêu đề section `28–38px`; tiêu đề form/admin khoảng `28–36px`;
  tiêu đề card/khóa học `18–22px`. Không áp cỡ hero cho tiêu đề từng item.
- Nhãn trang/eyebrow `9–10px`, in hoa, letter-spacing khoảng `1–1.8px`;
  cỡ nhỏ này dành cho nhãn trang trí, không dùng cho hướng dẫn hoặc thao tác chính.
- Chữ phụ/metadata thường `12–13px`. Tiêu đề lớn có letter-spacing âm vừa phải
  như mẫu hiện tại; không áp letter-spacing âm lớn lên body.
- Mỗi trang có một `h1`; section dùng `h2`, nhóm con dùng `h3` theo thứ bậc.
- Nội dung sản phẩm dùng tiếng Việt rõ ràng, ngắn và đúng hành động: “Thêm vào giỏ”,
  “Xóa khỏi giỏ”, “Thử lại”. Nhãn tiếng Anh dạng journal chỉ là nhận diện trang trí.
- Hiển thị tiền theo `vi-VN`, VND; ngày giờ theo quy ước API và múi giờ dự án.
  Không hardcode tổng tiền hoặc số lượng khi có dữ liệu thật.

## 5. Bố cục, khoảng cách và hình khối

- Home/Courses/Cart dùng container nội dung tối đa `1280px`, ở desktop thường
  `width: min(1280px, calc(100% - 64px))`, căn giữa. Header/footer public hiện
  dùng tối đa `1200px`; giữ đúng shell đã có khi thêm trang.
- Mobile dùng lề hai bên khoảng `20px`; không cho nội dung chạm mép màn hình.
- Tái dùng các khoảng cách đang có: `8/12/16/20/24/32/40/48/60/70px` theo mật độ.
  Đây là nhịp gợi ý, không phải yêu cầu sửa mọi số đo cũ về cùng một thang.
- Section lớn thường cách nhau `40–70px`; card/panel dùng padding `20–30px`.
  Thông tin liên quan phải gần nhau hơn khoảng cách giữa các nhóm.
- Đường chia section dùng viền `1px`; masthead/khối nhấn có thể dùng `2px`
  màu primary. Card danh sách ưu tiên góc vuông, đường kẻ rõ và bóng rất nhẹ hoặc không bóng.
- Nút/input dùng góc gần vuông theo token. Logo, avatar, badge và một số control
  trong shell có bo góc riêng; giữ component hiện có thay vì sửa toàn bộ về góc vuông.
- Catalog: hero hai cột, grid khóa học 3 cột desktop → 2 cột tablet → 1 cột mobile.
- Cart: danh sách bên trái, summary bên phải; màn hình hẹp xếp thành một cột,
  summary đi sau danh sách và không sticky trên mobile.
- Auth: phần nội dung giới thiệu và form hai cột, form khoảng `400px` ở desktop;
  mobile xếp lại theo mẫu đã có. Admin: navigation, nội dung chính và cột phụ;
  cột phụ có thể thu gọn, navigation chuyển sang menu mobile.

## 6. Component và thao tác

- Dùng lại Brand và Icon hiện có; icon dạng nét thống nhất, thường `16–20px`.
  Không trộn emoji, icon nhiều bộ hoặc tự thay logo.
- Một vùng thao tác có một CTA chính nổi bật; hành động phụ dùng outline/text link.
  Nút chính nền primary/chữ trắng; nút phụ nền trắng hoặc trong suốt/viền primary.
- Nút thông thường cao khoảng `44–48px`; vùng bấm chính/icon-only ít nhất `44px`.
  Control lọc nhỏ trên desktop phải vẫn thao tác thuận tiện khi lên mobile.
- Link dùng để đi trang/đến section; button dùng để đổi trạng thái hoặc thực hiện
  hành động. Không dùng `div` có click thay cho control semantic.
- Form có label thật và accessible name rõ; placeholder chỉ gợi ý, không thay label.
  Input tham khảo cao `49px`, padding `12px 14px`; lỗi nằm cạnh field liên quan,
  dùng `aria-invalid` và liên kết thông báo lỗi với field khi cần.
- Submit hiển thị trạng thái đang xử lý, ngăn gửi lặp và giữ dữ liệu đã nhập khi lỗi.
  Không thông báo thành công trước khi thao tác thật thành công.
- Bảng dữ liệu có header rõ, số/tiền căn nhất quán, filter và pagination theo API.
  Nếu bảng cần scroll ngang, giới hạn scroll trong vùng bảng, không ở cả trang.
- Dialog có tên, nút đóng rõ, giới hạn chiều cao và scroll nội dung khi cần.
  Hỗ trợ Escape, giữ focus trong dialog, trả focus về control mở khi đóng;
  menu mobile tuân theo cùng nguyên tắc bàn phím.
- Giỏ sản phẩm chứa class: không cho thêm trùng một lớp; số lượng và tổng tiền
  phải phản ánh trạng thái giỏ. Không tự thêm control số lượng cho suất học cá nhân.

## 7. Trạng thái UI và responsive

- Với chức năng có tải dữ liệu, xử lý các trạng thái cần thiết: loading, có dữ liệu,
  empty, error/retry, submitting và thành công. Không cần thêm trạng thái không có consumer.
- Empty giải thích vì sao trống và có hành động phù hợp. Error cho phép khôi phục
  khi có thể; giữ lựa chọn/filter/input của người dùng.
- Thông báo thay đổi dùng `role="status"`/`aria-live` phù hợp; không chỉ đổi màu nút.
- Giữ focus nhìn thấy rõ bằng `:focus-visible`; không xóa outline mà không thay thế.
  Các biểu tượng không có chữ phải có tên accessible; hình trang trí ẩn khỏi screen reader.
- Tôn trọng `prefers-reduced-motion`; chuyển động hiện tại nhẹ, khoảng `160ms`.
  Không thêm animation liên tục hoặc hiệu ứng làm khó đọc/thao tác.
- Breakpoint hiện tại: shell/Home/Auth/Admin `1150/850/600px`;
  Courses/Cart `1050/760/520px`. Chọn theo cấu trúc gần nhất, không bắt cả dự án
  đổi breakpoint và không chỉ làm giao diện đúng ở một kích thước.
- Kiểm tra ít nhất `1440`, `768`, `390`, `375px`: không tràn ngang toàn trang,
  không cắt chữ/nút, không che focus. Có thể ẩn trang trí hoặc link phụ;
  chức năng quan trọng vẫn phải có đường truy cập trên mobile.
- Grid dùng `minmax(0, 1fr)`, khối flex/grid có `min-width: 0` khi cần;
  không dùng `overflow-x: hidden` trên body để che lỗi bố cục.

## 8. Cách tổ chức code

- Tuân theo [architecture](./architecture.md): route composition ở `app`,
  business UI ở feature, primitive dùng chung ở `shared`.
- CSS Module là cách triển khai hiện tại. `exploration.module.css` chứa nền tảng
  preview; `ocean.module.css` chứa Home/Auth/Admin; `commerce.module.css` chứa
  Courses/Cart, artwork và dialog. Tham khảo chúng trước khi tạo style mới.
- Token `--preview-*` đang scoped trong UI Lab, không mặc định tồn tại ở route thật.
  Khi đưa thiết kế vào sản phẩm, đặt token ở shell phù hợp; chỉ đưa primitive/style
  vào shared khi có consumer thật. Không import sâu UI Lab từ feature khác.
- Không copy cả stylesheet hoặc tạo một bản button/form/nav mới cho mỗi trang.
  Không thêm UI framework chỉ để dựng một màn hình.
- Tránh selector global rộng làm thay đổi route khác. Scope override theo component,
  kiểm tra computed style nếu rule `.root h2`/`.root button` ghi đè cỡ chữ/control;
  không giải quyết bằng nhiều `!important`.
- Tách state/logic nghiệp vụ khỏi phần trình bày khi cần, giữ kiểu dữ liệu rõ ràng
  và kiểm tra response theo contract. Không dùng thiết kế để suy ra API chưa triển khai.

## 9. Quy trình bắt buộc cho chức năng có UI

1. Đọc tài liệu này cùng architecture, API contracts và progress; mở màn hình
   Ocean Editorial gần chức năng mới nhất để đối chiếu.
2. Xác định shell, component/tokens sẽ tái dùng, dữ liệu/API thật và các trạng thái
   cần hỗ trợ. Chỉ dùng fixture nếu nhiệm vụ là preview và ghi rõ phạm vi đó.
3. Viết UI theo quy tắc trên; hoàn thiện luồng thao tác, bàn phím và responsive.
4. Xem trực tiếp desktop/mobile, kiểm tra focus, dialog, nội dung dài và trạng thái
   empty/error khi áp dụng. Không chỉ dựa vào build để kết luận UI đúng.
5. Chạy lint, type-check/build và kiểm thử phù hợp với mức thay đổi. Luồng tương tác
   mới hoặc sửa lỗi cần kiểm thử hành vi có ý nghĩa; chỉnh CSS nhỏ không cần tạo test
   chỉ sao chép implementation. E2E chạy sau build theo cấu hình dự án.
6. Cập nhật progress và tài liệu liên quan; nếu bổ sung quy tắc/component dùng chung,
   cập nhật tài liệu này. Báo rõ điều đã kiểm tra và phần tích hợp còn thiếu.

Trước khi kết thúc, xác nhận: **đúng Ocean Editorial, đúng token/font, tái dùng shell,
thao tác hoạt động, trạng thái cần thiết đầy đủ, mobile không tràn, bàn phím dùng được,
và dữ liệu/feedback đúng phạm vi thật hoặc preview.**

## 10. Product integration từ Prompt 1–4

Identity và management product đã đưa Ocean Editorial vào app/globals.css và
AppShell. Tên token global cũ --green/--ink/--paper/--line được map đúng palette
Ocean; --primary/--text/--border và --preview-* là alias cùng giá trị cho consumer
thật. Không cần copy stylesheet UI Lab hoặc import private preview vào product.
AuthPage dùng layout auth chung; quản trị dùng shared management.module.css.
UnitWorkspace có hai consumer course units và class schedule, hỗ trợ hai vùng
scroll riêng và native mobile dialog, URL selection do feature quản lý.

## 11. Public catalog và commerce từ Prompt 5–8

Product public courses/classes dùng PublicShell với Brand, navigation và native
mobile menu; cart/checkout/orders dùng AppShell theo STUDENT. Cùng font/tokens
global, CSS Module của feature giữ layout riêng. Product không import fixture,
CSS private hoặc sessionStorage cart của UI Lab.

Public unit viewer là đề cương: title/description/score requirement từ course DTO,
không có video, progress hoặc completion giả. Rail/content dùng UnitWorkspace;
syllabus link giữ URL và mobile drawer trả focus về trigger khi đóng.

Cart hiển thị class, 1 suất/lớp, giá lúc thêm và giá hiện tại. Summary sau danh sách
trên mobile. Checkout CTA là “Tạo đơn giữ chỗ”; đơn PENDING chưa thanh toán và chưa
mở quyền học. Kết quả CASH có thể nhiều đơn, phải hiển thị đầy đủ. Countdown chỉ
tham khảo và đọc lại server; không dùng thời gian browser để tự đổi order status.
