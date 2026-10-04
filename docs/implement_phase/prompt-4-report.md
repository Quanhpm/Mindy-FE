# Prompt 4 — Class management integration

Implemented routes for ADMIN under the management guard:

- `/management/classes`: runtime-validated list, URL status/delivery-mode/course/mentor
  filter controls and page navigation. Course/mentor filter options exhaust active
  admin course and ACTIVE MENTOR pagination; existing URL IDs outside those active
  lists remain visible and can be cleared. Picker loading/error/retry is independent
  of class-list loading and errors, and filter changes reset to page 1.
- `/management/classes/new`: active admin course and active MENTOR pickers exhaust
  pageSize=100 pagination through the catalog/users public client entries.
- `/management/classes/[classId]`: management fields, lifecycle commands and
  class-unit snapshot schedule workspace; `?unitId=` keeps selection across
  reload/back-forward, invalid selections show unavailable.

Source checked against the companion BE controller, class DTOs, classes service,
schedule service and lifecycle/calendar source. Browser requests use the same-origin
adapter and authenticatedRequest. Approved dependencies are classes → auth/client,
catalog/client and users/client; no private feature imports or backend edits.

| Method | Path after `/api/v1` | Contract |
| --- | --- | --- |
| GET | `/admin/classes` | `{ items, page, pageSize, total }`; page/pageSize, courseId, mentorId, status, deliveryMode |
| POST | `/admin/classes` | Create draft with courseId, mentorId, code, name, startDate, endDate, maxStudents, deliveryMode, optional meetingUrl |
| GET | `/admin/classes/:classId` | Management detail including class unit IDs, sessions and private URLs |
| PATCH | `/admin/classes/:classId` | Explicit editable-field payload; no code/courseId/status |
| POST | `/admin/classes/:classId/sessions` | classUnitId from detail snapshot, title, startsAt, endsAt, optional roomName/meetingUrl |
| POST | `/admin/classes/:classId/open` | Draft → Open, guarded by backend readiness/course/mentor/calendar |
| POST | `/admin/classes/:classId/start` | Open → In progress |
| POST | `/admin/classes/:classId/complete` | In progress → Completed |
| POST | `/admin/classes/:classId/cancel` | Nonterminal → Cancelled |

Class commands and all class mutations return management detail. Completed/cancelled
classes are read only. Draft updates include dates/capacity/mode; Open/In progress
updates send only name, mentorId and meetingUrl (`null` clears it). No session
edit/delete action is offered. Lifecycle commands require explicit inline confirmation.

Date-only values stay YYYY-MM-DD throughout requests and render by splitting calendar
strings, preventing timezone shifts. Schedule forms explicitly label Vietnam time and
send ISO datetimes with +07:00. Input validation checks valid period/instants, snapshot
unit ownership and overlap with scheduled sessions of the same class. Backend owns
final validation and mentor conflicts. Every 409 refetches class detail, updates the
available lifecycle controls and preserves entered fields; read retry keeps the forms
mounted. Known backend errors have Vietnamese feedback.

Ocean Editorial tokens, shared management styles and UnitWorkspace are used. The
class edit form starts collapsed in native details so the default screen shows the
schedule workspace. Unit/session rail and detail/form regions scroll independently;
mobile uses the shared keyboard/focus-safe drawer. Public schemas intentionally omit
management lifecycle/audit fields, meeting URLs and classUnitId from sessions; the
management page renders only its management contract. Unit/session statuses displayed
are real DTO state.

Checks run by the Prompt 4 agent:

- `vitest run src/features/classes/domain/class-rules.spec.ts`: 8 tests passed.
- Scoped Biome over features/classes, management/classes routes and classes E2E:
  passed.
- `tsc --noEmit`: passed after shared workspace/public client entries were available.
- Added four Playwright mock scenarios: full-pagination create/schedule/lifecycle,
  mentor conflict/refetch/field preservation, selection/independent scroll/mobile
  keyboard at 1440/768/390/375, and STUDENT management denial. Execution is coordinated
  with the root's combined production build/E2E; do not label these live smoke.

Current limitation: cancel class does not automatically release pending seat holds.
The cancellation confirmation states that limitation. No live backend mutation,
database seeding/reset, Google flow, push/merge/deployment was performed by this agent.

## Kết quả kiểm tra tích hợp cuối

Root đã chạy production build rồi toàn bộ suite trên Node22.20.0/pnpm12.6.0:
Biome/boundaries/TypeScript,77unit tests và22Chromium E2E đều pass. Browser QA
có1440/768/390/375px, scroll/deep links/keyboard và ảnh product API mock.
Đây là bằng chứng thay thế trạng thái pending browser run ở các ghi chú agent
phía trên. Live backend/Google/SMTP vẫn chưa xác minh.
[Xem handoff cuối](./IMPLEMENTATION_PROMPTS_1_4.md).
