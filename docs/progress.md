# Frontend progress

## 2026-09-30 — Foundation + identity UI

- Created separate `mindy-fe` sibling of `Mindy-BE`; source baseline: backend dev/b500dbf.
- Next.js App Router, React, TypeScript strict, pnpm, Biome, React Hook Form and Zod.
- Vietnamese responsive landing, login, account and management shell.
- Integrated real identity API contracts: session, user list/filter/create/detail/status and logout.
- Same-origin API adapter with Origin verification, endpoint allowlist, body limit and no-store.
- Single-flight refresh with cross-tab Web Locks; session events via BroadcastChannel.
- Added module boundary checks, CI, unit tests and mocked browser E2E tests.
- Backend code has not been modified. Frontend has no seeded/fake production data.

- `pnpm check`: passed (Biome/module boundaries, TypeScript, 15 unit tests, production build).
- `pnpm test:e2e`: 3 Chromium scenarios passed (login/user management, access control/mobile, proxy policy). E2E uses a mocked API, not the live backend.

## Next phases

1. Smoke-test against running backend/PostgreSQL with a seeded admin.
2. Catalog screens when Phase 2 APIs are available.
3. Class operations and schedules.
4. File upload and materials.
5. Cart, checkout and orders.
6. Payment confirmation, enrollment and student learning screens.
7. Attendance and operational queries.
8. Production deployment and observability.

Chat, notifications, assignments, whiteboard and code judge follow their backend milestones.
Do not create placeholder feature modules without consumers.
