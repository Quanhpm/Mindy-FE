# Mindy UI — Learnthru

Chuẩn giao diện mới theo yêu cầu ngày 05/10/2026. Nguồn thị giác là ảnh Learnthru người dùng cung cấp và route `/learnthru`; trang áp dụng đầu tiên là `/management/users`. Theo yêu cầu tiếp theo, toàn bộ route sản phẩm đã dùng chung phong cách này: auth, catalog, lớp/học phần, compiler, tài khoản, giỏ hàng, checkout, đơn hàng, học tập và quản trị. UI Lab Ocean Editorial giữ riêng để tham khảo lịch sử.

## Bố cục quản trị

- Giao diện sản phẩm phủ toàn màn hình, không có viền/nền xám, khoảng đệm, bo góc hay bóng đổ ngoài cùng. Giữ nền xám nhạt và bo góc các vùng bên trong.
- Desktop: sidebar trắng 190–210px, nội dung nền xám nhạt co giãn, cột hồ sơ trắng 250–285px. Khung sản phẩm rộng 100% viewport; không cố định chiều cao khi dữ liệu dài.
- Sidebar: logo Mindy, navigation có icon và trạng thái active, khối trợ giúp phía dưới.
- Nội dung: thanh tiêu đề/ngày, welcome card trắng, ba card chức năng dùng xanh/lavender/hồng, bảng danh sách phía dưới.
- Cột phải: avatar và thông tin tài khoản đang đăng nhập, link hồ sơ, hướng dẫn nghiệp vụ thật. Chỉ dùng lịch/nhắc nhở nếu có dữ liệu tương ứng.
- Tablet ≤1100px: cột hồ sơ xuống dưới. Mobile ≤700px: menu bằng dialog native, nội dung một cột, card xếp dọc, bảng cuộn ngang trong vùng riêng.

## Màu

| Vai trò | Giá trị |
| --- | --- |
| Nền ngoài | Không có; shell phủ toàn màn hình |
| Nền workspace | `#ecedf2` |
| Panel | `#ffffff` |
| Chữ chính | `#4b5668` |
| Chữ phụ | `#747d8d` |
| Primary | `#8295c2` |
| Primary hover | `#657cac` |
| Input mềm | `#f6f6fa` |
| Viền | `#dde3ec` |
| Card xanh | `#3d609c` → `#5c7fb5` |
| Card lavender | `#5c83b8` → `#9b8caf` |
| Card hồng | `#a38ab0` → `#f48495` |

Tokens nền tảng dùng chung tại `src/app/globals.css`; shell/component giữ override và bố cục riêng. `--action: #536f9f` và hover `#435c88` dành cho CTA/link để rõ chữ, primary pastel dùng trang trí. Chữ phụ trong sản phẩm phải dễ đọc, không sao chép độ nhạt/cỡ chữ quá nhỏ của ảnh.

## Typography và component

- Font: `Avenir Next`, `Segoe UI`, Arial, sans-serif. Nội dung tiếng Việt.
- Body/bảng 13–15px; metadata 12px; tiêu đề trang 22–26px; section 15–18px.
- Khoảng cách: 8/12/16/20/24/28/32px; padding workspace 24–28px.
- Welcome/card/bảng bo 10–14px. Nút primary dạng pill cao tối thiểu 44px; input/select bo 10px.
- Avatar tròn; dùng chữ viết tắt khi backend chưa có avatar, không gán ảnh fixture cho người thật.
- Bảng có header nền mềm, hàng trắng, đường chia nhạt, badge vai trò và trạng thái kèm chữ.
- Tái sử dụng Brand, Icon, Avatar và các primitive phù hợp; không đổi tên thương hiệu thành Learnthru.

## Hành vi và dữ liệu

Giữ API, session, role guard, URL filters, phân trang, tạo tài khoản và xem chi tiết. Không đưa dữ liệu mẫu, số thống kê tự suy đoán, lịch giả hoặc thao tác giả vào trang sản phẩm. Tổng số lấy từ response đang lọc; nhãn phải nói rõ phạm vi đó. Các card vai trò là lối tắt bộ lọc, không phải số thống kê toàn hệ thống.

Có đủ loading, error/retry, empty và dữ liệu dài. Link để điều hướng, button để thay đổi trạng thái. Mọi control có label/focus nhìn thấy; dialog hỗ trợ Escape, focus trap và trả focus. Mobile không tràn trang. Kiểm tra desktop/mobile, quyền truy cập và luồng hiện có trước khi hoàn tất.

## Homepage — landing page dùng chung phong cách UI

Route `/` dùng header ngang, hero hai cột, các section khám phá/hướng dẫn/thực
hành, CTA và footer. Không áp dụng sidebar hoặc cột hồ sơ của dashboard.
Dùng chung ngôn ngữ Learnthru: palette xanh/lavender/hồng, font, card bo 10–14px,
nút pill, icon và nền mềm; typography/spacing lớn hơn theo bố cục landing page.
HomeShell giữ tỷ lệ và style riêng trên nền token chung. Mobile dùng native dialog
cho menu; motion hữu hạn, hỗ trợ prefers-reduced-motion. Minh họa sách và ví dụ
code không đại diện cho dữ liệu học tập hay kết quả chạy thật.

## Bố cục các trang sản phẩm khác

Auth dùng panel giới thiệu và form hai cột, mobile ưu tiên form. Public catalog
dùng header ngang, hero, filter và card khóa học. Tài khoản, giỏ hàng, checkout,
đơn hàng và học tập dùng header/navigation ngang theo vai trò; summary xuống
sau danh sách trên mobile. Chỉ admin dùng shell ba cột. UnitWorkspace thu rail
thành dialog khi viewport ≤850px hoặc nội dung thực tế ≤640px; giữ hai vùng
cuộn độc lập và selection trên URL.
