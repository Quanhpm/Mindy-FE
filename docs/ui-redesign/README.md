# Mindy UI mới — 06/10/2026

Thay UI cũ trên branch `Huy/Feat/UIredesign`, giữ API và logic nghiệp vụ.
Hướng thiết kế mềm giữa minimal và high-end theo mô tả Riki Nihongo của người dùng.
Quy tắc chi tiết ở [UI.md](../../UI.md), logic và API ở [logic-flow.md](../logic-flow.md).

## Đổi màu toàn dự án

Mở [theme.ts](../../src/shared/config/theme.ts), đổi `mindyTheme.palette`:

```ts
palette: 'coastal' as 'sky' | 'lavender' | 'coastal',
```

Mặc định hiện tại là palette 3 (`docs/pallete3.png`). Hoặc sửa màu trong
`palettes.sky` / `palettes.lavender` / `palettes.coastal` và `semantic`.
Root layout phát biến CSS; mọi shell, button, panel, form, badge và focus kế thừa.
Màu logo/mascot raster và ảnh khóa học giữ nguyên. Logo dùng nguyên bản docs/logo.jpg;
palette lấy từ docs/Pallate2.png và docs/pallete1.png. Font Geist Sans cho nội dung,
Nunito Variable đậm cho header public được đóng gói local. Header toàn chiều rộng,
không có card bọc bo tròn.

Các trang bên trong dùng Nunito, sidebar trái theo role và dropdown profile.
API bổ sung theo [Swagger live](https://api.quanh123.id.vn/docs#/): result mapping,
mentor CASH list/confirm, student CASH preview. QR từ payload BE được render
thành SVG ngay trong trang bằng react-qr-code, không dùng dịch vụ QR bên ngoài.

Ảnh kiểm tra dùng fixture: [Dropdown](./screenshots/profile-dropdown-desktop.png),
[Thu tiền mặt](./screenshots/mentor-cash-desktop.png),
[Xem trước lớp](./screenshots/cash-preview-desktop.png),
[QR desktop](./screenshots/payment-qr-desktop.png),
[QR mobile](./screenshots/payment-qr-mobile.png).

## Xem giao diện

Chạy `pnpm dev`, mở http://localhost:3002. Homepage đọc khóa học từ API thật.
Màn hình cá nhân/quản trị cần session và quyền tương ứng như trước.

Các ảnh dưới được chụp bằng Playwright với API fixture để kiểm tra UI;
dữ liệu fixture chỉ thuộc kiểm thử, không được đưa vào sản phẩm.

| Trang | Desktop | Mobile |
| --- | --- | --- |
| Trang chủ | [1440px](./screenshots/home-desktop.png) | [390px](./screenshots/home-mobile.png) |
| Đăng nhập | [1440px](./screenshots/login-desktop.png) | [390px](./screenshots/login-mobile.png) |
| Đăng ký | [1440px](./screenshots/register-desktop.png) | [390px](./screenshots/register-mobile.png) |
| Quản trị | [1440px](./screenshots/admin-desktop.png) | [390px](./screenshots/admin-mobile.png) |

## Kiểm chứng

Sau phản hồi header/auth: build và Biome pass; 15 E2E auth/identity/responsive pass.
Login/đăng ký mặc định không cuộn tại tám viewport, gồm 320×568 và 844×390.
Ảnh đăng ký [320×568](./screenshots/register-320x568.png) và
[844×390](./screenshots/register-844x390.png). Lỗi dài hoặc viewport nhỏ hơn do
bàn phím vẫn có thể cuộn riêng vùng form để giữ các trường và thông báo truy cập được.

134 unit tests, 71 Chromium E2E, TypeScript, boundaries và production build pass.
Đã kiểm tra các trang sản phẩm tại 1440/768/390/375px, menu/dialog bằng bàn phím,
rail nội dung cuộn độc lập, URL selection/history, dữ liệu dài, API error/retry/empty,
đổi palette và reduced-motion. Các file API/schema/domain/session/permissions không thay đổi.

Biome đầy đủ trên các file code/CSS đã sửa và check toàn repo khi tắt formatter pass.
`pnpm lint` mặc định vẫn báo 183 lỗi formatter CRLF/LF kế thừa ở các file không sửa.
Không normalize các file nghiệp vụ ngoài phạm vi UI. Browser E2E dùng API mô phỏng;
đợt này không nghiệm thu provider Google/PayOS/SMTP thật.

Nguồn UI Lab/Learnthru cũ đã gỡ; URL preview cũ redirect về `/`.
Các khoảng trống API trong logic-flow.md vẫn còn; UI rewrite không thay đổi trạng thái đó.
