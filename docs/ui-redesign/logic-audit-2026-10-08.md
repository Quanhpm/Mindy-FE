# Áp dụng logic UI toàn app — 08/10/2026

Nhánh: `redesign-ui`, tạo từ `dev` tại `9b99b13`. Chuẩn: [UI.md](../../UI.md).
Lần này áp dụng logic điều hướng, trạng thái, quyền, form và recovery; giữ hướng
trình bày Mindy hiện tại. Không thêm endpoint hoặc thay transaction/lifecycle BE.

## Bản đồ kiểm tra toàn app

| Khu vực/route | Đối chiếu và áp dụng |
| --- | --- |
| Homepage `/` | Giữ CTA/query bốn khóa/fallback, nội dung minh họa và reduced-motion đã khớp chuẩn. Health có khóa tức thời và bỏ response sau unmount. |
| Login/register/verify/Google completion | Giữ schema/redirect/intent thật; thêm khóa tức thời chống submit lặp; input không đổi trong lúc gửi. |
| Google callback | Giữ finalize một lần dưới session lock và safe return policy có sẵn. |
| Account và shell nội bộ | Giữ profile thật/nav theo role; logout khóa tức thời, dialog logout-all trả focus. |
| Protected/management boundary | Remount nội dung theo userId/role để form quản trị không giữ dữ liệu tài khoản trước. Role/owner/enrollment vẫn được BE kiểm tra. |
| Users list/create/detail | Giữ URL role/status/page và shortcut; create/status dùng request có abort, khóa gửi, lỗi/unknown recovery, giữ input, trả focus dialog. |
| Categories | Giữ create/list active; unknown create yêu cầu đọc toàn bộ categories và kiểm tra trước retry. |
| Courses list/create/detail/units | Giữ filter/tab/unit URL, fields/ảnh và snapshot; create/update/add/reorder/activate có khóa/abort/recovery. Parent và form con khóa các thao tác xung đột. |
| Classes list/create/detail/sessions | Giữ filter/picker đầy đủ/URL; mutations có abort/recovery, giữ input sau 409; lifecycle xác nhận trong native dialog, chặn lệnh không còn hợp lệ. |
| Public courses/course/unit/class | Giữ browse filters/pagination/schema public; PublicShell thêm link CASH theo MENTOR, không nhầm lỗi phiên là anonymous. |
| Cart/add/remove | Giữ logic đã có: STUDENT, classId, giá server, chống lặp và read recovery. Dùng chung classifier unknown-result với UI quản trị. |
| Checkout/orders/order detail | Sửa hướng dẫn CASH/PayOS cho chức năng thực; giữ state machine recovery, toàn bộ split orders, owner, polling/freshness và đồng hồ tham khảo. |
| PayOS/payment-result | Giữ lookup owner, QR nguyên payload, nullable fallback, hide stale/paid và không tin URL status. |
| MENTOR cash orders | Giữ đủ tiền, snapshot mentor, read recovery sau unknown, không tự replay. |
| CASH preview/full learning | Giữ phân biệt hold với ACTIVE enrollment, không lộ meeting URL ở preview; unit membership và dữ liệu riêng tư theo phiên. |
| ADMIN reconciliation | Giữ paymentId/null handling, đọc lại sau lệnh, không suy ra resolved/cấp quyền. |
| Compiler | Giữ editor/stdin/output/status thật; abort và bỏ response khi rời route. |
| Error/404/preview cũ | Giữ retry đọc/đường về; preview cũ redirect homepage. |

## Recovery cho form quản trị

`useUiMutation` sở hữu khóa đồng bộ, request signal, busy/error/unknown và kết
quả đọc kiểm tra. Không replay mutation. `MutationFeedback` dùng chung phản hồi.

1. Gửi một lần; chỉ phản hồi đúng component còn hoạt động mới cập nhật UI.
2. Lỗi mạng/response không xác định/server error khóa gửi tiếp và giữ input.
3. “Kiểm tra kết quả” chỉ GET. Với detail đọc đúng ID; category đọc toàn bộ;
   user/course/class creation đọc danh sách mới nhất và ghi rõ phạm vi đọc.
   Không coi “chưa thấy trong trang mới nhất” là chứng minh chưa được tạo.
4. Đọc lỗi vẫn khóa, chưa có nút mở lại gửi. Đọc được thì hiển thị dữ liệu để
   người dùng kiểm tra; chỉ “Đã kiểm tra, cho phép thử lại” mới mở khóa. Nút này
   không tự gửi request ghi.
5. 409 đọc trạng thái mới mà không reset input; lệnh lifecycle không còn hợp lệ
   bị khóa ngay trong xác nhận. Dialog giữ lỗi, Escape/hủy trả focus khi không
   đang gửi. Rời route/đổi account hủy UI request, không hứa hủy transaction BE.

Đọc lại khóa/học phần đồng bộ dữ liệu của màn hình cha, giữ input ở form con.
Dialog trạng thái tài khoản giữ target/nhãn đã chọn; nếu tài khoản đã đạt target,
không cho xác nhận để vô tình đảo trạng thái. Khi lifecycle loại bỏ trigger cũ,
focus về hành động tiếp theo hoặc tiêu đề lớp.

Các API client chỉ thêm AbortSignal tùy chọn. Không thay payload/path/ownership
hoặc giữ private data trong browser storage. Auth operations tiếp tục dùng cơ
chế serialize/session lock có sẵn, không thay bằng cơ chế business mutation.

## Kiểm chứng

Kết quả kiểm tra được cập nhật ở [progress](../progress.md). Browser E2E dùng API
mô phỏng, không phải chứng nhận provider PayOS/Google/email thật. Screenshot QA
cho recovery được tạo trong `test-results` (ignored); các screenshot snapshot
được test tạo lại ngoài phạm vi thay đổi sẽ không đưa vào diff sản phẩm.
