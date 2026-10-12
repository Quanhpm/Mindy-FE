# Mindy — logic UI toàn app

Cập nhật **08/10/2026**, đối chiếu source mới nhất của `origin/dev` sau fetch:
`9b99b133786236261b408c10d66ca6bbbda0be0a` (merge ngày 06/10/2026).
Tài liệu thay thế UI.md cũ, dùng làm chuẩn logic cho những lần triển khai tiếp.
Chỉ mô tả điều hướng, quyền, điều kiện hành động, trạng thái, phản hồi và phục hồi
thao tác; không quy định layout hoặc hình thức trình bày. Đây là audit source,
không phải nghiệm thu chạy app hay provider thật.

“Hiện tại trên dev” là hành vi đã có. “Quy tắc áp dụng” là yêu cầu dùng chung khi
phát triển tiếp, không khẳng định mọi màn hình đã đáp ứng. Điểm lệch đã xác minh
ở mục 12. Khi tài liệu lịch sử mâu thuẫn, ưu tiên source tại revision đã chốt.

**Bản áp dụng trên nhánh `redesign-ui` ngày 08/10/2026:** giữ snapshot `dev`
bên dưới để truy vết; bản triển khai bổ sung khóa thao tác tức thời, hủy request
khi rời màn hình, kiểm tra kết quả ghi chưa rõ trong form quản trị, dialog xác
nhận trạng thái lớp, navigation thu tiền của MENTOR trên public catalog và sửa
copy checkout. Các route/API, giá, quyền và lifecycle nghiệp vụ giữ nguyên.
Xem [audit áp dụng toàn app](docs/ui-redesign/logic-audit-2026-10-08.md).

## 1. Quy tắc áp dụng toàn app

- Mỗi màn hình phải giúp người dùng biết đang xem gì, dữ liệu thuộc ai, được làm
  gì, thao tác đã có kết quả chưa và bước tiếp theo là gì.
- Điều hướng dùng link; thay đổi dữ liệu dùng button/form. Nhãn nói rõ kết quả:
  “Thêm người dùng”, “Tạo đơn giữ chỗ”, “Vào lớp”.
- Chỉ cung cấp hành động thật. Không thêm tìm kiếm, sort, sửa, xóa hoặc số liệu
  nếu nguồn dữ liệu chưa hỗ trợ. Nội dung minh họa phải ghi rõ là minh họa.
- Quyền và trạng thái quyết định khả năng thao tác; nút bị khóa có lý do.
  Ẩn nút không thay thế kiểm tra quyền khi người dùng mở trực tiếp URL.
- Giá, chỗ trống, trạng thái tài khoản/lớp/đơn/thanh toán và quyền học lấy từ hệ
  thống. Không suy ra PAID từ URL, đồng hồ hay việc đã bấm nút.
- Đang gửi thì chặn gửi trùng và có nhãn “Đang…”. Chỉ báo thành công sau phản hồi
  hợp lệ hoặc sau khi đọc lại xác minh được kết quả.
- Mất phản hồi thao tác ghi là “chưa rõ kết quả”, không mặc định thất bại.
  Đọc lại dữ liệu trước khi cho người dùng chủ động thử thao tác lại.
- Đổi truy vấn/tài khoản hoặc rời màn hình phải bỏ qua phản hồi cũ; không để dữ
  liệu của phiên trước xuất hiện trong phiên mới.
- Bàn phím và thiết bị nhỏ phải dùng được cùng chức năng. Đóng menu/dialog trả
  focus về nút mở; dialog đang gửi có thể khóa đóng để tránh hiểu nhầm đã hủy.

## 2. Phiên đăng nhập, quyền và điểm vào

| Trạng thái phiên | Phản hồi và hành vi |
| --- | --- |
| loading | Đang kiểm tra phiên; chưa mở dữ liệu riêng tư. |
| authenticated | Tài khoản thật và chức năng theo role. |
| anonymous | Public vẫn hoạt động; trang bảo vệ chuyển tới login. |
| error | Báo không kiểm tra được phiên, có tải lại; không coi lỗi mạng là anonymous. |

Khách mở trang bảo vệ được chuyển tới `/login?next=<route/query/hash hiện tại>`.
Đăng xuất chủ động chuyển tới `/login`. `next` chỉ nhận đường nội bộ trong
`safeReturnTo`; sai thì dùng fallback. `next` hợp lệ không cấp quyền, trang đích
vẫn kiểm tra role và quyền tài nguyên.

Hết phiên/đăng xuất/đổi tài khoản phải bỏ dữ liệu và thao tác riêng tư cũ. Không
lưu token, hồ sơ, giỏ hoặc đơn trong browser storage làm nguồn dữ liệu UI.

| Đối tượng | Điểm vào mặc định password login | Chức năng chính hiện có |
| --- | --- | --- |
| Khách | `/` là trang public | Khóa học, đề cương, lớp public, compiler, login/register. |
| ADMIN | `/management/users` | Người dùng, danh mục, khóa học, lớp & lịch học, đối soát. |
| STUDENT | `/account` | Tài khoản, khóa học, giỏ, checkout, đơn, lớp đủ quyền. |
| MENTOR | `/account` | Tài khoản, thu tiền mặt, khóa học. |

ADMIN không mua lớp thay STUDENT và không xác nhận tiền mặt thay MENTOR.
MENTOR không dùng management hoặc giỏ/checkout/đơn dành cho STUDENT. Sai role có
thông báo và đường về tài khoản. Owner/enrollment vẫn được hệ thống kiểm tra.

## 3. Trang chủ `/`

### 3.1. Điều hướng và CTA hiện tại trên dev

Route `/` ghép `HomeShell`, `HomeContent`, `FeaturedCourses` và `HealthCheck`.
Logo Mindy mở `/`; link “Đến nội dung chính” tới `#main-content`.

| Điểm tương tác | Nhãn hiện có | Đích/hành vi |
| --- | --- | --- |
| Navigation chính | Trang chủ | `/`, đánh dấu trang hiện tại. |
| Navigation chính | Khám phá khóa học | `/courses`. |
| Navigation chính | Thực hành code | `/compiler`. |
| Navigation chính | Cách bắt đầu | `#hanh-trinh`, tới nội dung hướng dẫn trên cùng trang. |
| Navigation/header | Đăng nhập | `/login`, không truyền next. |
| Header | Bắt đầu học | `/register`. |
| Giới thiệu chính | Khám phá khóa học / Thử viết code | `/courses` / `/compiler`. |
| Lựa chọn bắt đầu | Xem khóa học / Thử ngay / Tạo tài khoản | `/courses` / `/compiler` / `/register`; cả lựa chọn là link. |
| Nhóm khóa học | Tất cả khóa học | `/courses`, không phải tải thêm ngay trên homepage. |
| Từng khóa học | Ảnh, tên và link chi tiết | Cùng `/courses/:courseId`. |
| Nhóm thực hành | Mở không gian code | `/compiler`. |
| Lời mời cuối trang | Bắt đầu cùng Mindy | `/register`. |
| Navigation cuối trang | Khám phá khóa học / Góc thực hành / Tạo tài khoản | `/courses` / `/compiler` / `/register`. |

Các CTA login/register tĩnh, chưa đổi theo phiên hoặc role; homepage không có
menu hồ sơ, logout hay navigation quản trị/học viên. Bấm CTA chỉ điều hướng,
không tự tạo giỏ/đơn hoặc cấp quyền học. Navigation trong dialog có cùng năm
link của navigation chính; CTA “Bắt đầu học” không được thêm vào danh sách đó.

### 3.2. Khóa học và các trạng thái dữ liệu

- Khi component được mở, đọc `GET /api/v1/courses?page=1&pageSize=4`; chỉ hiển
  thị tối đa bốn items đầu, giữ thứ tự phản hồi. Không lọc/sort/phân trang hoặc
  tự xoay khóa học trên homepage; không khẳng định đây là khóa nổi bật/bán chạy
  dựa trên thống kê. “Tất cả khóa học” mở catalog đầy đủ.
- Tên, category và giá lấy từ dữ liệu; giá định dạng `vi-VN` và ký hiệu `₫`.
  Description thiếu/rỗng dùng “Khám phá đề cương và lịch học của khóa học.”.
  Ảnh null/lỗi dùng fallback chứa code khóa học, không thay bằng khóa mẫu.
- Đọc lần đầu hiện “Đang tải khóa học…”. Lỗi request hoặc dữ liệu sai schema
  hiện thông báo và “Thử lại”; nút này đọc lại cùng truy vấn, không reload toàn
  trang. Phản hồi request đã bị hủy khi rời component không cập nhật UI.
- Không có items thì hiện “Chương mới đang được chuẩn bị.” và hướng dẫn khóa
  sẽ xuất hiện khi được mở; không dựng card giả. Lỗi/rỗng chỉ ảnh hưởng nhóm
  khóa học, các CTA khác vẫn có thể dùng.

### 3.3. Nội dung hướng dẫn và thực hành

Hành trình gồm ba bước “Tìm điều bạn muốn học”, “Chọn lớp, gặp mentor”, “Bắt đầu
và thực hành”. Đây là nội dung tĩnh, không có thao tác đánh dấu hoàn thành và
không phản ánh tiến độ cá nhân. Code hello và output “Xin chào, Mindy!” có nhãn
“Kết quả minh họa”; homepage không có editor, nút chạy hoặc gọi compiler.
Muốn thực hành thật dùng CTA tới `/compiler`.

### 3.4. Menu, kết nối và hiệu ứng

- Nút “Mở menu” mở native dialog “Menu Mindy”; nút “Đóng menu” hoặc Escape
  đóng, trả focus về nút mở. Chọn một link trong navigation dialog cũng đóng.
  Logo trong dialog là link về `/`, không có handler đóng riêng.
- “Kiểm tra kết nối hệ thống” chỉ mở/đóng nội dung kiểm tra; không tự gọi API.
  “Kiểm tra backend” mới gọi `/api/v1/health/live`; đang gửi khóa nút, hiện
  “Đang kiểm tra…” và xóa thông báo cũ.
- Phản hồi hợp lệ hiện “Backend đang hoạt động” cùng timestamp định dạng
  `vi-VN`; lỗi mạng hoặc dữ liệu sai hiện “Không thể kiểm tra backend. Vui lòng
  thử lại.”. Người dùng bấm lại nút để thử; kết quả không chứng nhận toàn bộ
  chức năng nghiệp vụ hoạt động. Health và khóa học là hai request độc lập.
- Hiệu ứng chỉ chạy khi không yêu cầu reduced-motion; animation của section
  được kích hoạt khi cuộn tới và được dọn khi rời trang. Không dùng hiệu ứng
  hoặc vị trí cuộn làm trạng thái nghiệp vụ hay điều kiện hoàn thành hành trình.

### 3.5. Quy tắc áp dụng

CTA phải đưa tới một bước cụ thể, không tự hoàn tất đăng ký/thanh toán/cấp quyền
học. Các trang public giữ nội dung public truy cập được; chỉ yêu cầu login tại
bước cần quyền. Nếu đổi CTA theo phiên, dùng session thật và điểm vào đúng role.

## 4. Login và tài khoản

### 4.1. `/login`

1. Email được trim, kiểm tra định dạng, tối đa 320 ký tự; mật khẩu bắt buộc,
   dài 1–128 ký tự. Không dùng quy tắc mật khẩu đăng ký cho login.
2. “Hiện/Ẩn” đổi khả năng đọc mật khẩu, giữ giá trị và không submit.
3. Validation hiện cạnh trường; lỗi đăng nhập hiện trong form, giữ input để sửa.
4. Đang gửi hiện “Đang đăng nhập…”, khóa submit và lựa chọn Google.
5. Thành công thiết lập phiên rồi `replace` tới safe next hoặc điểm vào theo role.
   Người đã đăng nhập mở login cũng chuyển theo quy tắc này.
6. Ngoại lệ: lỗi callback Google giữ login để đọc lỗi, kể cả còn phiên cũ;
   password login thành công ngay tại đây mới tiếp tục chuyển trang.
7. Google bắt đầu OAuth với return path an toàn; “Đăng ký ngay” tới `/register`.
   Chưa có luồng quên/đặt lại mật khẩu.

### 4.2. Register và xác thực email

- `/register`: tên, email, phone tùy chọn, mật khẩu 6–128 ký tự; tạo STUDENT,
  không tự chọn role/status.
- Yêu cầu được tiếp nhận thì chuyển sang thông báo kiểm tra email, chưa coi là
  đã đăng nhập/ACTIVE. Copy không khẳng định địa chỉ chắc chắn đã tồn tại.
- Gửi lại email có trạng thái đang gửi, kết quả/lỗi và link về login.
- `/verify-email?token=...`: kiểm tra token, chỉ xác thực khi người dùng bấm nút.
  Link sai/hết hạn có hướng dẫn đăng ký/gửi lại. Thành công tạo phiên và về role home.

### 4.3. Google

- `/login/google/callback`: báo đang hoàn tất, xử lý callback một lần, bỏ dữ
  liệu callback nhạy cảm khỏi URL; lỗi về login với thông báo phù hợp.
- Google chưa khả dụng và xác thực thất bại có thông báo riêng; vẫn dùng email được.
- `/register/complete`: đọc context còn hạn; email chỉ đọc, prefill tên nếu có;
  hoàn tất tên/phone mới thiết lập phiên mới. Context hợp lệ được ưu tiên dù còn
  phiên tài khoản cũ; hết hạn có cách bắt đầu Google lại.
- Google start hiện fallback `/account` khi thiếu next; user mới hoàn tất
  onboarding về role home. Không khẳng định mọi nhánh Google redirect giống password.

### 4.4. `/account`

Hồ sơ thật của phiên chỉ đọc: tên, email, phone, role/status, ngày tham gia và
đăng nhập gần nhất; thiếu giá trị có thông báo tương ứng. “Đăng xuất mọi thiết
bị” mở xác nhận, nêu cần đăng nhập lại cả thiết bị hiện tại; đang gửi khóa hủy/
xác nhận, lỗi giữ dialog, thành công về login. Chưa có sửa hồ sơ/upload avatar.

## 5. Quản lý lúc mới vào và điều hướng nội bộ

### 5.1. Điểm vào ADMIN: `/management/users`

Không có dashboard `/management` riêng. Kiểm tra phiên và ADMIN trước dữ liệu.

1. Mặc định không lọc role/status; page 1, pageSize 20 nếu URL không chỉ định.
2. Đọc danh sách với loading, lỗi/thử lại, kết quả hoặc “Chưa có người dùng phù
   hợp”. “Mới nhất trước” là thứ tự đang có, không có điều khiển đổi sort.
3. ADMIN/MENTOR/STUDENT là bộ lọc nhanh, không phải thống kê. Bấm role đang chọn
   để bỏ lọc; trạng thái chọn đồng bộ với bộ lọc role.
4. Đổi role/status/pageSize về page 1; đổi page giữ lọc. URL giữ truy vấn để
   reload/mở lại đúng dữ liệu.
5. Tổng là tổng từ phản hồi đã lọc, không phải tổng từng role suy ra từ một trang.
   Khóa Trước/Sau khi không còn trang hợp lệ.
6. “Thêm người dùng” tới `/management/users/new`; tên/nút chi tiết tới
   `/management/users/:userId`. Chưa có keyword search.

### 5.2. Hành vi dùng chung khu vực nội bộ

- Navigation theo role ở mục 2; route con vẫn đánh dấu nhóm đang truy cập.
  Tên màn hình hiện tại phản ánh khu vực hoặc luồng đang mở.
- Menu tài khoản dùng tên/role thật; có tài khoản của tôi, về trang chủ, đăng
  xuất. Bấm mở/đóng; pointer/focus ra ngoài hoặc Escape đóng; Escape trả focus.
- Đăng xuất chặn gửi trùng, báo đang xử lý; thành công về login, thất bại báo lỗi.
- Menu điều hướng dạng dialog có cùng chức năng; chọn link đóng, đóng trả focus.

## 6. Trạng thái, form, URL và dialog dùng chung

Đây là chuẩn áp dụng khi tạo hoặc sửa màn hình, không phải khẳng định tất cả
component hiện tại đã xử lý đầy đủ mọi trường hợp.

| Tình huống | Logic UI yêu cầu |
| --- | --- |
| Đọc lần đầu/đổi truy vấn | Loading đúng đối tượng; không coi dữ liệu cũ là kết quả của truy vấn mới. |
| Rỗng | Phân biệt chưa có dữ liệu và không khớp bộ lọc, kèm bước tiếp theo thật. |
| Lỗi đọc tạm thời | Thông báo dễ hiểu và đọc lại; nút retry đọc không gửi lại mutation. |
| Không đủ quyền/không tìm thấy | Không lộ dữ liệu riêng tư, có đường về; không retry mù quáng. |
| Form sai | Lỗi cạnh trường, giữ giá trị để sửa. |
| Đang ghi | Khóa gửi trùng và hành động xung đột; báo đang xử lý. |
| Thành công | Thông báo kết quả, cập nhật từ phản hồi/đọc lại; mở tài nguyên mới khi phù hợp. |
| Xung đột | Đọc trạng thái mới, giải thích điều kiện thay đổi, giữ input khi có thể. |
| Mất phản hồi ghi | Báo chưa rõ kết quả; xác minh trước deliberate retry. |

Lọc/phân trang chỉ dùng trường hỗ trợ; đổi lọc reset page. Lựa chọn học phần nằm
trên URL, hỗ trợ reload/history, kiểm tra thuộc đúng khóa/lớp. ID sai hiện không
khả dụng, không âm thầm chọn đối tượng khác. Đổi học phần đóng dialog chọn và đưa
nội dung mới về đầu để đọc.

Xác nhận nêu đối tượng/tác động. Hủy trước gửi đóng dialog và không thay đổi dữ
liệu; đóng UI sau gửi không có nghĩa hệ thống đã hủy request. Lỗi trong dialog
phải đọc được. Dùng alert cho lỗi/status cho kết quả; trường có label, liên kết
mô tả lỗi và aria-invalid, nút icon có tên truy cập được.

## 7. ADMIN: người dùng, catalog, lớp và đối soát

| Route | Logic hiện có |
| --- | --- |
| `/management/users/new` | Tạo managed user: email, tên, mật khẩu 12–128 ký tự, phone tùy chọn, role; không chọn status. |
| `/management/users/:userId` | Đọc hồ sơ; ACTIVE → tạm khóa, SUSPENDED → kích hoạt, PENDING_VERIFICATION → kích hoạt thủ công, qua xác nhận. Kích hoạt thủ công không phải xác thực email. |
| `/management/course-categories` | Danh mục active, bảng/phân trang và chọn số mục; nút tạo mở modal, tạo thành công đóng modal và tải lại bảng; chưa sửa/xóa/list inactive. |
| `/management/courses`, `/new` | Lọc category/isActive, phân trang; tạo khóa chưa kích hoạt. |
| `/management/courses/:courseId` | Tab học phần/thông tin qua URL; sửa thông tin/ảnh, thêm/reorder học phần, activate. |
| `/management/classes`, `/new` | Lọc course/mentor/status/deliveryMode, phân trang; chọn khóa active/mentor active, tạo DRAFT. |
| `/management/classes/:classId` | Chọn học phần, thêm lịch, sửa trường theo trạng thái, lifecycle bằng hành động riêng. |
| `/management/payments/reconciliation` | Sự kiện cần review, không phải mọi thanh toán; phân trang, reconcile khi có paymentId, đọc lại kết quả. |

Khóa học: mã không sửa; activate cần học phần và danh mục hợp lệ. Thêm học phần
thì chọn học phần mới; reorder khóa ở đầu/cuối hoặc vượt 200 units. Các lớp đã
tạo giữ snapshot riêng. Chưa sửa/xóa unit, deactivate course hoặc upload ảnh.
Ảnh null/lỗi có fallback; xóa ảnh qua trường ảnh được hỗ trợ.

Lớp: DRAFT → OPEN → IN_PROGRESS → COMPLETED; ba trạng thái đầu có hủy,
COMPLETED/CANCELLED chỉ đọc. DRAFT sửa các trường cho phép; OPEN/IN_PROGRESS chỉ
sửa tên/mentor/meeting URL. Không sửa mã/khóa bằng form cập nhật. Mở lớp cần
units và ít nhất một buổi SCHEDULED hợp lệ. Thêm buổi dùng unit của lớp, kiểm tra
end > start, trong kỳ và không trùng lịch; hệ thống kiểm tra lại. Lịch dùng
Asia/Ho_Chi_Minh, không dịch ngày date-only qua UTC. Chưa sửa/xóa buổi. Xác nhận
hủy lớp giải thích pending holds chưa tự giải phóng ngay theo nghiệp vụ hiện tại.

Đối soát: không reconcile event thiếu paymentId. Status trả về là kết quả lệnh;
đọc lại danh sách, không tự xóa event hoặc suy ra resolved.

## 8. Public catalog và chọn lớp

- `/courses`: lọc category/deliveryMode/khoảng ngày bắt đầu lớp, phân trang trên
  URL; chưa có keyword search, level, price sort.
- `/courses/:courseId`: thông tin/đề cương và lớp mở đăng ký, phân trang lớp thuộc
  khóa. Người dùng chọn lớp cụ thể để mua.
- `/courses/:courseId/units/:unitId`: đề cương public, kiểm tra unit thuộc khóa;
  thiếu mô tả/không khả dụng có thông báo. Không giả video/quiz/progress.
- `/classes/:classId`: mentor, kỳ học, hình thức, phòng/lịch/chỗ; không có meeting
  URL riêng tư. Lớp không mua được khóa CTA và nêu lý do trước bước kiểm tra phiên.
- Thêm giỏ: loading phiên thì chờ; lỗi phiên có reload; khách đi login với safe
  next; ADMIN/MENTOR nhận thông báo dành cho học viên; STUDENT mới gửi thêm.
- Thành công hoặc chưa rõ kết quả đều đọc giỏ. Đã có lớp thì “Đã có trong giỏ ·
  Xem giỏ”; đọc lại thất bại khóa thêm tiếp và có “Đọc lại giỏ hàng”.

## 9. STUDENT: giỏ, checkout, đơn và PayOS

### 9.1. Giỏ và checkout

- `/cart`: thuộc phiên, mỗi lớp một mục, tối đa 20 lớp; xóa và đọc lại giỏ,
  tổng lấy từ hệ thống. Rỗng dẫn tới khóa học.
- Phân biệt giá snapshot/current và lớp không mua được. Có thể mua trên giỏ
  không bảo đảm còn chỗ lúc checkout.
- `/checkout`: đọc giỏ/đơn gần đây; mặc định CASH, chọn CASH/PAYOS. Rỗng hoặc có
  lớp không mua được thì khóa tạo đơn.
- CASH tách theo mentor, PAYOS một đơn cho toàn giỏ; hiển thị đủ đơn trả về.
  Tổng cuối do hệ thống tính; tạo đơn chỉ giữ chỗ, chưa PAID.
- Mất response: kiểm tra lại đơn và giỏ, hiện các đơn quan sát được. Chỉ cho tạo
  lại khi recovery cho phép; không tự gửi lại checkout.

### 9.2. Danh sách và chi tiết đơn

`/orders` lọc status/phân trang trên URL. `/orders/:orderId` kiểm tra owner.

| Trạng thái đơn | Phản hồi và hành động |
| --- | --- |
| PENDING còn hạn | Đồng hồ tham khảo; PAYOS có thanh toán, CASH chờ mentor và có xem trước khi dữ liệu hợp lệ. |
| PENDING tới hạn đồng hồ | Báo tới hạn và kiểm tra lại, không tự đổi EXPIRED. |
| PAID | Link từng lớp, kiểm tra quyền học lại khi mở. |
| EXPIRED | Báo hết hạn từ hệ thống, kiểm tra lớp còn chỗ trước đăng ký mới. |
| CANCELLED | Báo bị hủy từ hệ thống; không cấp quyền học. |

PENDING poll 5 giây khi tab visible, đọc lại khi trở lại tab; dừng khi terminal,
ownership denial hoặc unmount. Có cập nhật thủ công. Lỗi đọc làm mất khả năng
dùng link/QR hoặc tạo thanh toán từ dữ liệu cũ. STUDENT chưa có tự hủy đơn.

### 9.3. PayOS và kết quả trả về

- Tạo/tiếp tục/reuse link trên cùng đơn, không checkout mới để xử lý lỗi link.
  Sau thao tác luôn đọc lại đơn để xác minh; chưa đọc được thì khóa tạo tiếp.
- Payment CREATING/PENDING/SUCCEEDED/REQUIRES_REVIEW khác trạng thái order;
  processing/review không đồng nghĩa PAID hoặc quyền học.
- Link cần dữ liệu còn hợp lệ, đơn còn payable và payment PENDING. QR còn cần
  payment chưa hết hạn, payload hợp lệ và không có kết quả đang chưa rõ.
- QR encode nguyên payload, không tự dựng từ checkoutUrl. Không có QR dùng link
  hợp lệ; mở provider tab mới, giữ trang đơn theo dõi. PAID/mất freshness thì ẩn
  phương tiện thanh toán không còn hợp lệ.
- `/payment/result?orderCode=...`: đúng một mã PayOS hợp lệ, lookup đơn của owner
  rồi replace `/orders/:id`; không tin status/cancel hoặc query khác để xác nhận PAID.
- Mã thiếu/sai có lỗi và về đơn; lỗi mạng có đọc lại; 403/404 không retry tự động.
  Mã PayOS khác mã Mindy và UUID đơn.

## 10. Thu tiền mặt, preview và học tập

### 10.1. `/mentor/cash-orders`

Chỉ MENTOR được giao mới xem/xác nhận. Có phân trang và lịch sử status, chưa có
status filter. PENDING còn hạn mới có ghi nhận thu tiền. Chọn đơn mở form, số
tiền ban đầu trống; nhập số nguyên VND đúng toàn bộ tổng, không xác nhận thu một
phần. “Hủy” trước gửi đóng form; đang gửi khóa thao tác. Lỗi/mất phản hồi đọc lại
danh sách trước thử lại có chủ đích. ADMIN không xác nhận thay. Đã PAID/hết điều
kiện có thông báo thay nút thu tiền.

### 10.2. Quyền lớp

| Route | Điều kiện và nội dung |
| --- | --- |
| `/learning/classes/:classId/preview?unitId=...` | STUDENT CASH pending hold hợp lệ; units, lịch/phòng; không meeting URL. |
| `/learning/classes/:classId?unitId=...` | STUDENT ACTIVE enrollment được hệ thống chấp nhận; nội dung lớp/meeting URL được phép. |

Chọn unit thuộc lớp trên URL; thiếu units/lịch/phòng có thông báo. Preview hết
quyền hướng dẫn kiểm tra đơn; nếu PAID mở learning từ chi tiết đơn. PAID cung cấp
link, không thay kiểm tra enrollment. Chưa có danh sách enrollment tổng quát,
progress, materials, attendance, bài tập/quiz; không dựng “lớp của tôi” từ một
trang orders hay tự đặt tiến độ.

## 11. Compiler, lỗi trang và đường cũ

- `/compiler` hiện public để thử nghiệm, chưa gắn quyền học/progress. Chọn mẫu
  thay code/stdin và xóa kết quả cũ.
- Nút chạy/Ctrl hoặc Cmd+Enter kiểm tra input, chặn chạy trùng, xóa kết quả cũ,
  báo đang chờ; hiện success/user error/timeout/output limit/infrastructure
  error/busy/rejected theo kết quả thật.
- Hiện stdout/stderr, exit code/thời gian nếu có; thiếu output/lỗi hoặc bị cắt
  có thông báo. Không dùng kết quả compiler xác nhận hoàn tất học.
- 404 có đường về `/`; lỗi trang có thử tải lại.
- `/learnthru`, `/ui-lab` và preview cũ redirect `/`; không lấy logic fixtures
  của các bản thử nghiệm làm nghiệp vụ sản phẩm.

## 12. Điểm lệch đã xác minh, cần lưu ý khi áp dụng

| Hiện trạng trên dev | Quy tắc cho lần chỉnh tiếp |
| --- | --- |
| HomeShell đọc phiên thật (cập nhật 09/10/2026). | Header/menu hiện tên và role, Quản trị chỉ ADMIN; loading/error không hiện CTA của khách. |
| Checkout còn copy “PayOS chưa có link hoặc QR; tiền mặt chưa có chức năng xác nhận”. | Copy lỗi thời; chức năng thật đã có ở mục 9–10. Không mang câu này sang UI mới. |
| Google start fallback account, password fallback role home. | Giữ phân biệt hiện tại; đồng nhất cần sửa policy và kiểm tra callback/onboarding. |
| safeReturnTo chưa nhận `/` hoặc `/compiler`. | Không hứa quay lại hai route này sau login khi chưa mở rộng policy. |
| logic-flow/api-contracts có audit cũ dưới cập nhật hiện hành. | Ưu tiên revision source đã chốt; result mapping/CASH/QR đã có trên dev. |

Copy checkout đã được sửa trên `redesign-ui`. Homepage header/menu đã đọc phiên thật từ 09/10/2026; CTA nội dung hero giữ nguyên. Fallback
Google/password giữ hành vi của snapshot; đây không phải yêu cầu thêm chức năng
tự chuyển role hay mở rộng return-path policy. Public catalog trên nhánh mới
phân biệt loading/error phiên với anonymous, vẫn giữ nội dung public đọc được.

## 13. Nguồn đối chiếu và tiêu chí áp dụng

Nguồn tại revision dev đã chốt:

- Trang chủ: `src/app/_components/home-shell.tsx`,
  `src/features/home/components/home-content.tsx`,
  `src/features/catalog/components/featured-courses.tsx`,
  `src/features/catalog/components/course-image.tsx`,
  `src/features/catalog/api/public-catalog.browser.ts`,
  `src/features/health/components/health-check.tsx`, `src/shared/ui/brand.tsx`,
  `src/app/(public)/page.tsx`, `src/app/layout.tsx`.
- Login/quyền/phiên: `src/features/auth/components/`,
  `src/features/auth/permissions/access-policy.ts`, `src/features/auth/session/`.
- Quản lý lúc vào: `src/app/_components/app-shell.tsx`,
  `src/app/_components/mindy-admin-shell.tsx`,
  `src/features/users/components/users-list.tsx`.
- Toàn app: routes trong `src/app/`; components/domain/schemas của catalog,
  classes, cart, orders, payments, learning, compiler; feedback và
  `src/shared/components/unit-workspace.tsx`.

Khi áp dụng màn hình: kiểm tra role/owner, điểm vào/đường về, loading/empty/error/
success, chống gửi trùng, URL khớp lọc/lựa chọn, giữ input hợp lý, recovery không
lặp giao dịch, bàn phím/dialog dùng được và không có dữ liệu/hành động giả.
Kiểm tra nghiệp vụ theo phần thay đổi; tài liệu này không chứng nhận nghiệm thu
runtime toàn app.

Đối chiếu chéo homepage ngày 08/10/2026: fetch lại dev vẫn cùng revision; đã
kiểm tra composition, toàn bộ link/CTA, nguồn dữ liệu và schema, fallback,
health/menu/animation. Đọc thêm `tests/e2e/home-theme.spec.ts` để đối chiếu các
scenario hiện có cho khóa học thật qua API mô phỏng, retry/rỗng, keyboard menu
và cleanup khi điều hướng; chưa chạy lại browser tests trong lần cập nhật tài
liệu này. Những file source homepage được đối chiếu không khác giữa checkout
hiện tại và revision dev này.


## Bổ sung 10/10/2026: Lớp giảng dạy

MENTOR có mục Lớp giảng dạy trong sidebar và menu catalog. `/mentor/classes`
đọc lớp được giao, lọc trạng thái và phân trang trên URL. Chọn Xem học viên mở
`/mentor/classes/:classId/students`, lọc CASH/PAYOS và trạng thái đơn trên URL.
Bảng thể hiện tên học viên, trạng thái đăng ký, mã/trạng thái đơn, học phí lớp
và tổng đơn/số lớp. canConfirmCash hợp lệ dẫn sang Thu tiền mặt; cần xác nhận
đủ tổng đơn. Không có sửa lớp/lịch hoặc xác nhận thanh toán bằng classAmount.
ADMIN/STUDENT không gọi API này. Loading/error/retry/empty và bảng cuộn ngang
cục bộ được giữ; không dựng số lượng học viên từ chỗ trống.

Điều hướng mentor: mục Khóa học/Khám phá khóa học trong shell được thay bằng
Lớp giảng dạy → `/mentor/classes` (sidebar, CTA sidebar, header/mobile/footer
trang chủ và menu catalog).


## Bổ sung 11/10/2026: MANAGER

MANAGER hiển thị Quản lý, có không gian/sidebar riêng: Lớp học và Tài liệu môn học.
Đăng nhập password về `/manager/classes`. Lớp học hiển thị tất cả lớp, lọc trạng
thái/phân trang trên URL; Xem học viên mở `/manager/classes/:classId/students`
với filter hình thức/trạng thái thanh toán. Manager chỉ xem dữ liệu, không có
CTA thu tiền hoặc quản trị users/sửa lớp. `/manager/materials` chỉ là route chờ
chi tiết; không có thao tác upload giả. Mentor giữ trang/phân công cũ.


## 12/10/2026 — Điều hướng theo phiên và role

Trang `/` chờ bootstrap session. ADMIN chuyển `/management/users`, MANAGER chuyển
`/manager/classes`, MENTOR chuyển `/mentor/classes` bằng replace; không render
landing trong lúc chờ hoặc chuyển trang. Khách/STUDENT vẫn xem landing; lỗi phiên
vẫn có thể xem public và thử lại. Password login chỉ nhận next trong khu vực
đúng role đối với staff; STUDENT giữ return path an toàn cũ. Google callback marker
sau khi xác minh session cũng dùng policy này. Truy cập trực tiếp `/account` vẫn
xem hồ sơ. Trang chi tiết thuộc khu vực role vẫn giữ URL/filter khi login.
