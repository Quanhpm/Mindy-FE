# Mindy UI — thiết kế mới

Theo yêu cầu ngày 06/10/2026, thay toàn bộ UI Learnthru/Ocean cũ, giữ logic nghiệp vụ. Hướng thị giác mềm, nằm giữa minimal và high-end theo cảm nhận người dùng về Riki Nihongo. Áp dụng gpt-taste cùng hướng dẫn minimalist-ui và high-end-visual-design; ưu tiên yêu cầu người dùng khi các skill mâu thuẫn.

## Thương hiệu và màu toàn dự án

Nguồn duy nhất cho màu: `src/shared/config/theme.ts`. Mặc định `coastal` (palette 3); có thể chọn `sky` hoặc `lavender`, hoặc sửa palette đang chọn. Root layout đưa config lên html thành CSS variables; tất cả shell, component, trạng thái và focus dùng các biến này. Không hardcode màu trong stylesheet.

- Sky: palette docs/Pallate2.png — #c6e7ff, #d4f6ff, #fbfbfb, #ffddae.
- Lavender: docs/pallete1.png — #fff2f2, #a9b5df, #7886c7, #2d336b.
- Coastal (đang dùng): docs/pallete3.png — #355872, #7aaace, #9cd5ff, #f7f8f0.
- Ink/action mặc định #2d336b để chữ và CTA có độ tương phản.
- Các màu trạng thái nằm trong cùng config, đi kèm chữ/icon.
- Logo nguyên bản docs/logo.jpg, được phục vụ từ public/brand/mindy-logo.jpg. Không thay bằng logo tự vẽ.
- Minh họa Mindy tại public/mindy/coding-mascot.png, tạo dựa trên nhân vật logo. Raster logo/minh họa/ảnh khóa học giữ màu nguyên bản; config thay màu giao diện.

## Typography, hình khối và khoảng cách

Geist Sans local qua package geist cho nội dung; header public dùng Nunito Variable local, chữ đậm viết hoa 16–17px theo mẫu người dùng. Font hỗ trợ tiếng Việt, không tải Google khi build. Hero rộng, tối đa 2–3 dòng; body 14–17px, tiêu đề có tracking âm nhẹ. Màu pastel dùng cho khối minh họa, action tối cho CTA. Card bo 19–32px, nút bo 12–16px; không dùng pill hoặc gradient của UI cũ. Bóng ít, viền nhẹ lấy từ ink. Section landing cách nhau khoảng 65–105px; workspace ưu tiên mật độ dễ thao tác.

## Bố cục

Vùng homepage “Có nhiều cách để bắt đầu” dùng Nunito giống header: tiêu đề card
30px, weight 800; mô tả và link 16px. Tiêu đề vùng weight 750. Mobile giữ mô tả
16px và tiêu đề card 28px để dễ đọc.

- Homepage: header trắng toàn chiều rộng, không card bọc bo tròn, dải màu thương hiệu phía dưới; hero phủ nền trời pastel với mây nhẹ tại public/mindy/hero-clouds.webp, mascot không còn khối nền riêng. Nền dùng luminosity blend trên --mindy-primary để đổi palette đồng bộ. Bento 2+1+1, khóa học thật qua API, hành trình, góc code, CTA và footer. GSAP scoped, cleanup khi đổi route, reduced-motion và không pin/che nội dung form.
- Auth: layout 100dvh, panel pastel có mascot và form độc lập; mobile ẩn panel, ưu tiên form. Màn hình thấp dùng form hai cột để login/đăng ký mặc định vừa viewport, không cuộn trang. Khi validation hoặc bàn phím làm thiếu chiều cao, chỉ vùng form cuộn để mọi trường và lỗi vẫn truy cập được.
- Public catalog: header trắng toàn chiều rộng cùng homepage, giới thiệu, bộ lọc và card khóa học; không sidebar.
- Student và Mentor: sidebar theo vai trò bên trái, profile dropdown ở topbar; Nunito 15–16px, tiêu đề đậm, giảm card lồng nhau. Giỏ/checkout có summary, đơn hàng có QR thanh toán ngay trong trang; mentor có danh sách thu tiền mặt, student có xem trước lớp đang giữ chỗ.
- Admin: MindyAdminShell hai cột sidebar + workspace, profile dropdown trong topbar; bảng/form tăng cỡ chữ, giữ thao tác, bộ lọc và URL selection. Mobile dùng sidebar drawer.
- UnitWorkspace: rail và nội dung cuộn độc lập, thu rail thành native dialog khi viewport ≤850px hoặc workspace ≤640px.
- Mobile lề 20px, layout một cột; bảng chỉ cuộn trong vùng riêng. Không ẩn overflow toàn trang để che lỗi bố cục.

## Logic giữ lại

Giữ BFF /api/v1, Zod schema, HttpOnly session, role guard, URL filters/pagination, create/update/reorder, cart, order, checkout, PayOS recovery/polling, learning và reconciliation. Homepage mới chỉ gọi GET /courses bằng adapter có sẵn. Không thêm API giả, số tiến độ, review hoặc thống kê suy đoán. Ví dụ code trên homepage có nhãn “Kết quả minh họa”; compiler chạy thật vẫn dùng logic cũ.

Các nguồn UI preview cũ đã gỡ. /learnthru, /ui-lab và URL preview cũ chuyển về homepage. Các thử nghiệm nghiệp vụ được giữ; kiểm tra responsive và keyboard được cập nhật cho thiết kế mới.

Đọc docs/logic-flow.md để làm việc với các flow và khoảng trống tích hợp API đã audit.
