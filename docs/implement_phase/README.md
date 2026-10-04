# Frontend implementation phases

Bộ tài liệu này chuyển implementation phases của backend thành kế hoạch frontend
có thể giao việc và nghiệm thu. Tài liệu nằm trong source repository `mindy-fe`,
cùng cấp `docs` với backend; cấu trúc `src/app`, `src/features`, `src/shared` là
đích triển khai được mô tả trong từng phase.

## Bàn giao cho chat mới

[8 prompt tích hợp backend hiện có](./PROMPTS_BACKEND_INTEGRATION.md) là hướng dẫn
triển khai mới nhất, đối chiếu BE `feat(api)/booking-sprint` / `577af2f` ngày
2026-10-02. Mỗi prompt tự dẫn tới context chung, có thứ tự và checklist bàn giao.
Course unit bắt buộc rail trái cuộn độc lập, nội dung bên phải theo ảnh Coursera
đã lưu trong repo. Áp dụng vào admin units (prompt 3) và public unit viewer (prompt 5).
Các bảng phase bên dưới giữ snapshot cũ `608ff54`; không dùng để kết luận API
catalog/class/cart hiện chưa tồn tại. Payment và ACTIVE learning vẫn là backlog BE.

## 1. Nguồn và thứ tự ưu tiên

- [Quy ước frontend](../../AGENTS.md).
- [Kiến trúc frontend](../architecture.md), [API baseline](../api-contracts.md)
  và [tiến độ frontend](../progress.md).
- [Implementation phases backend](../../../Mindy-BE/docs/implement_phase/README.md)
  và [tiến độ backend](../../../Mindy-BE/docs/progress/Progress.md).
- [Core flow plan](../../../Mindy-BE/docs/CORE_FLOW_IMPLEMENTATION_PLAN.md).

Kế hoạch được đối chiếu ngày **2026-10-02** với source backend local commit
`608ff54`. Frontend hiện có contract identity tham chiếu `b500dbf`; những chênh
lệch được ghi thành task Phase 1, chưa được sửa code trong lần viết tài liệu này.

Controller, DTO runtime, guard và response thực tế quyết định API đã có.
Implementation phase quyết định phạm vi mục tiêu. Khi hai nguồn chưa khớp, ghi
dependency cần chốt, không suy diễn rằng endpoint trong roadmap đã được triển khai.
Phase 2 chi tiết của backend được ưu tiên hơn các milestone cũ khi khác nhau về
cash confirmation, checkout `orders[]`, reservation hoặc enrollment.

## 2. Thứ tự thực hiện

1. [Phase 0 — Foundation, API adapter và deployment baseline](./PHASE_0_FOUNDATION.md).
2. [Phase 1 — Registration, users, Google/password authentication và authorization](./PHASE_1_IDENTITY_AUTH.md).
3. [Phase 2 — Course registration, checkout, payment và enrollment](./PHASE_2_COURSE_TO_PAYMENT.md).

Mỗi phase là một vertical slice: route → feature UI → schema/API client → adapter
→ backend → feedback → kiểm thử. Có thể chuẩn bị contract và test fixtures của
phase sau trong khi backend đang hoàn thiện; chỉ đóng phase khi exit criteria FE
và dependency BE tương ứng đã đạt.

| Phase BE | Phạm vi FE tương ứng | Trạng thái FE tại ngày đối chiếu |
| --- | --- | --- |
| 0 — Hạ tầng và quy ước | Next.js, module boundaries, UI baseline, adapter, CI/deploy | Có nền tảng; cần hoàn tất bằng chứng onboarding/deploy |
| 1 — Registration + User + Auth | Email verification, Google onboarding, session, quản trị users | Có email/password và users; thiếu Google UI, còn contract drift |
| 2 — Catalog + Class + Cart + Payment + Enrollment | Public catalog, management, checkout, cash/PayOS, quyền học | Kế hoạch; backend chưa có các module nghiệp vụ này trong source đối chiếu |
| 3 — File + Materials | Upload lifecycle, file READY, học liệu theo enrollment | Roadmap; chờ tài liệu/API Phase 3 BE |
| 4 — Attendance + Operational Queries | Roster, điểm danh, lịch và truy vấn vận hành | Roadmap; chờ tài liệu/API Phase 4 BE |
| 5 — Production Hardening + Deploy | Kiểm thử tích hợp, accessibility/performance, giám sát và rollout | Roadmap; baseline deployment thuộc Phase 0 |
| 6 và các module mở rộng | Chat/notification, whiteboard, assignment, compiler/judge | Theo milestone BE tương ứng; compiler playground hiện tại là thử nghiệm riêng |

Backend hiện có tài liệu chi tiết Phase 0–2 nên frontend cũng chi tiết đúng ba
phase này. Phase 3 trở đi giữ trong roadmap, chưa tự đặt API hoặc nghiệp vụ thay BE.

## 3. Quy ước chung

- Giữ `app -> features -> shared`; `app` dùng `client.ts`/`server.ts` public entry.
- Quy tắc hiện tại chỉ cho phép `users -> auth/client`. Feature mới cần request đã
  xác thực phải có quyết định dependency và cập nhật boundary check trước khi code.
- Không tạo thư mục/placeholder module khi chưa có consumer thật.
- NestJS sở hữu authentication, authorization, giá, số chỗ, transaction và quyền
  học. FE hiển thị trạng thái từ backend, không tự cấp quyền bằng state local.
- Browser gọi `/api/v1` cùng origin. URL backend và secret chỉ ở server; không
  lưu raw token, cookie hay onboarding credential trong browser storage.
- Payload riêng với response; TypeScript boundary rõ ràng và Zod kiểm tra runtime.
  Không import NestJS entity hoặc thư viện database vào frontend.
- Allowlist đúng method/path; kiểm tra Origin cho mutation; dữ liệu cá nhân no-store.
  Redirect OAuth có adapter riêng, không mở generic proxy cho redirect tùy ý.
- Filter/pagination lưu trong URL, form dùng React Hook Form + Zod, session dùng
  auth context. Date/time hiển thị Asia/Ho_Chi_Minh; tiền là số nguyên VND từ API.
- Mỗi màn hình có loading/error/empty/success, bàn phím, label và mobile layout.
- Không retry mutation khi kết quả chưa rõ; đọc lại resource trước khi quyết định.
- Phân biệt mock E2E với smoke FE → BE thật. Mock không chứng minh transaction,
  concurrency, signature hoặc quyền truy cập backend.
- Đóng phase phải cập nhật `docs/progress.md`, API/architecture nếu thay đổi,
  chạy `pnpm check` và E2E liên quan. Checklist chưa có bằng chứng giữ `[ ]`.

## 4. Definition of done

- Route, navigation, quyền hiển thị và deep link thống nhất với API đã triển khai.
- Form, response schema, expected errors và proxy policy có consumer/test thật.
- Không lộ dữ liệu private trong SSR, cache, DOM, log hoặc fixture artifact.
- Unit/adapter tests và browser journeys phù hợp pass; smoke tích hợp được ghi rõ
  môi trường, bước chạy, kết quả và dependency chưa hoàn tất.
- Không dùng dữ liệu production để phát triển hoặc mô phỏng thanh toán tiền thật.
- Tài liệu và checklist phản ánh trạng thái thực tế, không coi kế hoạch là hoàn tất.

## 5. Kế hoạch UI thử nghiệm riêng

- [5 mẫu giao diện xanh dương/trắng](./PLAN_UI_EXPLORATION_BLUE_WHITE.md): đã dựng
  trên branch `feat/ui-exploration-blue-white`, đủ Home, Login, Register và Admin
  overview của mỗi mẫu. [Bàn giao, URL và ảnh so sánh](../ui-exploration/README.md).
  Chỉ UI/fixture preview, độc lập với Phase 0–2 và không thay đổi phạm vi API/nghiệp vụ.
