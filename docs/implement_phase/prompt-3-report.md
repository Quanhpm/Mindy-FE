# Prompt 3 — Catalog management handoff

Implementation target verified: backend `feat(api)/booking-sprint` at
`577af2f0e11607ed827be9ac1f9682a9c629f7b8`. Controller/DTO/service source matched the
planned catalog APIs. Read architecture, API contracts, progress, UI rules, backend
page map/progress, Ocean Editorial admin source/reference, and saved Coursera image.

## Implemented routes and behavior

- `/management/course-categories`: paginated active categories and inline creation;
  optional slug/description omitted when empty; slug conflict/required feedback.
- `/management/courses`: admin pagination and URL filters `categoryId`, `isActive`,
  `page`, `pageSize`. No unsupported search or sorting query.
- `/management/courses/new`: category picker exhausts active category pagination;
  validates code/title/integer VND; backend creates inactive course.
- `/management/courses/[courseId]`: separate course-field tab and unit workspace.
  PATCH excludes `code`/`isActive`, empty description becomes `null`; activation is
  a separate command and disabled until there is a unit.
- Unit workspace uses shared `UnitWorkspace`: independent rail/content scroll,
  selected link with accessible current state, URL `unitId`, deep links/reload/
  back-forward, native mobile drawer, invalid unit unavailable state, empty
  description state. Only add/read/reorder are exposed.
- Reorder commands send a validated full permutation via PUT. Buttons are disabled
  during the mutation; a 409 refetches authoritative course/unit state. Existing
  class unit positions remain unaffected by course reorder.
- Every response passes runtime Zod validation; mutations have exact DTO payloads.
  Empty/loading/error/retry/submitting/success states preserve form data on failure.

## Public feature API and boundaries

`catalog -> auth/client` is deliberate for authenticated management requests.
`classes -> catalog/client` is deliberate for its course picker; exported
`listActiveAdminCourses(signal?)` reads **all** admin course pages with
`isActive=true&pageSize=100` and returns `CourseManagement[]`. Root owns boundary
policy and adapter changes. No private catalog imports are needed by classes.

Catalog requests:
`GET /course-categories`, `POST /admin/course-categories`,
`GET/POST /admin/courses`, `GET/PATCH /admin/courses/:courseId`,
`POST /admin/courses/:courseId/units`,
`PUT /admin/courses/:courseId/units/order`,
`POST /admin/courses/:courseId/activate`.

## Validation evidence

- Pinned Node 22.20.0 and pnpm 12.6.0 used through explicit Corepack executable.
- Scoped Biome: passed (19 files at initial handoff; subsequent catalog changes
  rechecked). Module boundaries: passed. `tsc --noEmit`: passed after all agents'
  shared files became available.
- Catalog unit suite: **12 passed** (input restrictions, precision/price limits,
  complete-permutation reorder, exact mutation payloads, runtime invalid-response
  rejection, complete pagination, conflict propagation).
- Added `tests/e2e/catalog-management.spec.ts`: 4 mock browser scenarios covering
  creation/course edits/unit reorder/activation, 409 refetch + invalid unit,
  separate scrolling and mobile drawer/Escape/focus/deep links at
  1440/768/390/375px, plus student guard.
- Production build/E2E/visual QA: root runs a single combined suite; final browser
  results should replace this pending note in shared progress.
- Live catalog integration was **not run by this agent**. Browser API fixtures
  exercise frontend behavior and are separate from a live FE → BE smoke.

## Contract limits

Only active categories can be read; there is no category edit/deactivate/delete,
course delete/deactivate, or unit edit/delete endpoint. Course reorder DTO accepts
at most 200 IDs; larger templates remain readable/addable but reorder controls
explain and respect that limit. Required score is genuine metadata, with no
invented learning progress/completion/video/quiz state. Backend and unrelated
staged/unstaged work were preserved; no commit/push/merge/deploy was performed.

## Kết quả kiểm tra tích hợp cuối

Root đã chạy production build rồi toàn bộ suite trên Node22.20.0/pnpm12.6.0:
Biome/boundaries/TypeScript,77unit tests và22Chromium E2E đều pass. Browser QA
có1440/768/390/375px, scroll/deep links/keyboard và ảnh product API mock.
Đây là bằng chứng thay thế trạng thái pending browser run ở các ghi chú agent
phía trên. Live backend/Google/SMTP vẫn chưa xác minh.
[Xem handoff cuối](./IMPLEMENTATION_PROMPTS_1_4.md).
