# Mindy — Ocean Editorial

[Quy tắc UI](../ui-rules.md) là tài liệu bắt buộc đọc trước khi tạo/sửa giao diện.

Đã chốt **mẫu 07 · Ocean Editorial** ngày 02/10/2026. Giữ Home, Login,
Register và Admin của mẫu này; bổ sung Khóa học và Giỏ hàng cùng phong cách; đã xóa chín mẫu còn lại, gallery so sánh,
menu chọn mẫu/nền, ảnh nền thử, CSS và screenshot không dùng.

## Xem giao diện

Chạy `pnpm dev` và mở `/ui-lab`; trang tự chuyển tới Ocean Editorial Home.
Các liên kết trực tiếp khi chạy preview trên port 3001:

| Màn hình | Liên kết |
| --- | --- |
| Home | [Trang chủ](http://localhost:3001/ui-lab/ocean-editorial/home) |
| Khóa học | [Danh sách khóa học](http://localhost:3001/ui-lab/ocean-editorial/courses) |
| Giỏ hàng | [Giỏ hàng](http://localhost:3001/ui-lab/ocean-editorial/cart) |
| Login | [Đăng nhập](http://localhost:3001/ui-lab/ocean-editorial/login) |
| Register | [Đăng ký](http://localhost:3001/ui-lab/ocean-editorial/register) |
| Admin | [Quản trị](http://localhost:3001/ui-lab/ocean-editorial/admin) |

Thanh review chỉ đổi màn hình và trạng thái minh họa. Các URL của mẫu đã
xóa trả 404. Giao diện Ocean Editorial giữ nguyên bố cục tạp chí, màu xanh
biển/trắng, form hai cột và admin ba cột; không áp dụng ảnh nền thử của mẫu 04/09.

## Phạm vi hiện tại

Đây là bộ giao diện đã chọn trong khu vực preview. Form có validation,
hiện/ẩn mật khẩu và submit minh họa; admin có bộ lọc, phân trang, loading,
empty, error/retry và menu mobile. Preview không gọi API nghiệp vụ, bootstrap
session hoặc lưu dữ liệu đăng nhập. Route sản phẩm hiện tại giữ chức năng thật.

Khóa học hỗ trợ tìm kiếm không dấu, lọc chủ đề/trình độ, sắp xếp giá và xem nội dung khóa học. Giỏ hàng hỗ trợ thêm, xóa, tổng tiền và xem lại đăng ký; mỗi khóa học chỉ được thêm một lần. Sáu khóa học và giá là dữ liệu minh họa, chưa kết nối thanh toán/đăng ký học thật. Giỏ lưu ID đã kiểm tra trong `sessionStorage` với key `mindy-ocean-preview-cart`, giữ khi chuyển trang/tải lại trong cùng tab; nếu storage không khả dụng vẫn dùng bộ nhớ.

Auth hỗ trợ `?state=error`, `submitting`, `notice`; admin hỗ trợ `loading`,
`empty`, `error`. Các route preview có metadata `noindex`.

## Source và kiểm tra

- `src/features/ui-exploration/variants/`: Home, Courses, Cart, Auth và Admin của Ocean Editorial.
- `styles/ocean.module.css`: bố cục của giao diện đã chọn.
- `styles/exploration.module.css`: tokens, form, table và các thành phần dùng chung còn cần thiết.
- `styles/commerce.module.css`: catalog, artwork khóa học, giỏ hàng và dialog responsive.
- `screenshots/`: chỉ ảnh Ocean Editorial desktop/mobile cùng manifest.
- `scripts/capture-ui-lab.mjs`: chụp sáu màn hình của mẫu đã chọn.
- `tests/e2e/ui-exploration.spec.ts`: kiểm tra layout, tương tác, responsive và route đã xóa.

Chạy `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`, sau đó
`pnpm exec playwright test tests/e2e/ui-exploration.spec.ts --workers=1`.
Chụp lại giao diện bằng `UI_LAB_BASE_URL=http://localhost:3001 node scripts/capture-ui-lab.mjs`.
