# Quy tắc UI Mindy

Đọc [UI.md](../UI.md) trước khi tạo/sửa UI. Thiết kế ngày 06/10/2026 thay toàn bộ UI cũ theo yêu cầu người dùng; logic nghiệp vụ giữ nguyên.

1. Màu chỉ khai báo tại src/shared/config/theme.ts. CSS dùng --mindy-* hoặc alias semantic từ globals.css; không thêm mã màu riêng trong module. Asset logo/mascot và ảnh do backend cung cấp giữ nguyên màu.
2. Dùng Brand với logo trong docs; nội dung Geist Sans, header public Nunito Variable đậm 16–17px và không card bọc bo tròn. Font local, icon nét thống nhất, tiếng Việt rõ ràng. Avatar dùng chữ tên người thật nếu API chưa có ảnh. Không fixture trong sản phẩm.
3. Tái dùng đúng shell: HomeShell, PublicShell, AuthPage, AppShell cho student và MindyAdminShell cho admin. Không ép trang công cụ/quản trị thành landing có hero.
4. Landing thoáng, hero tối đa 2–3 dòng, bento kín. Workspace dùng panel, bảng và form gọn; card 19–32px, nút 12–16px. Một CTA chính mỗi vùng.
5. Link điều hướng, button đổi trạng thái. Label và focus rõ; vùng bấm ít nhất 44px. Form giữ lỗi validation, trạng thái đang xử lý và chống gửi lặp.
6. Giữ API, schema, session, quyền, URL selection/filter và pagination. Loading, error/retry, empty, success phải đúng dữ liệu. Tiền vi-VN/VND; ngày theo quy ước API. Không tự suy ra tiến độ/tổng số học viên.
7. Dialog native có tên, Escape, focus trap, trả focus về trigger. Nội dung/rail học phần cuộn độc lập. Bảng cuộn cục bộ, trang không tràn ngang tại 1440/768/390/375px.
8. GSAP scoped và cleanup; reduced-motion bỏ motion. Nội dung vẫn đọc được khi animation tắt. Không animation gây trì hoãn thao tác form.
9. Nguồn UI preview cũ đã gỡ; route lịch sử redirect về /. Không import lại learnthru/ui-exploration hoặc khôi phục UI cũ vào chức năng thật.
10. Chạy type-check, boundaries, unit tests, build và behavioral/responsive E2E phù hợp; xem screenshot desktop/mobile trước khi giao. Cập nhật progress và tài liệu khi thay đổi quy tắc.
