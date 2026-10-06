# Phase 2.2 — FE integration completed for confirmed BE contracts

Date: 2026-10-06. Backend source: `Feat/Webhooktest` / `5c9e581`.

## Implemented

| Route | Behavior |
| --- | --- |
| `/orders/:orderId` | Create/reuse PayOS link, new-tab checkout, processing/review/expiry states, visible-only polling and recovery |
| `/learning/classes/:classId?unitId=...` | Authorized private timetable/units/rooms/meeting URLs; URL selection and mobile drawer |
| `/management/courses/new`, `/management/courses/:courseId?tab=fields` | Validate course image URL, create/update/clear, omit unchanged image |
| `/courses`, `/courses/:courseId` | Course image with null/load-error fallback |
| `/management/payments/reconciliation` | ADMIN event pages, nullable payment IDs, provider reconcile and refetch |

PayOS link creation is a separate command after checkout. Failed/unknown creation
reads the same order before permitting retry. Reads do not overlap. Pending orders
poll every 5 seconds only while visible; returning to the tab triggers a read.
The browser never sets PAID/ACTIVE or cancels orders based on redirect/query data.

OrderDetail validates payment.orderId; list/checkout continue using the base Order.
Payments and learning have separate feature entry points and exact BFF rules.
Provider callbacks remain outside the browser proxy. All private components follow
the existing in-memory session boundary and cancel/discard results on account change.

Reconciliation results are displayed as provider/server statuses. Events may stay
in review after the command; FE has no resolve/refund/manual grant capability.
Student access is checked by BE even when the navigation comes from a PAID order.

Existing Learnthru changes were preserved; this integration does not define a new
UI rollout. There are no placeholder materials, progress charts or enrollment lists.

## Validation

- Node 22.20.0; pinned pnpm 12.6.0 used for backend frozen dependency installation.
- Full FE Biome/boundaries, TypeScript and production build: pass.
- 134 unit tests, 24 files: pass.
- 72 Chromium scenarios: pass, mocked APIs. Includes 16 payment/learning/review
  scenarios and 3 course-image scenarios, plus the existing product regressions.
- Responsive checks at 1440/768/390/375, keyboard, unit drawer/history, horizontal
  table containment and no page overflow. Desktop/mobile captures visually reviewed.
- BE built-app payment HTTP suite: 3/3 pass on the isolated test database.
- FE BFF smoke: real session cookies/guards + PostgreSQL + test-only fake PayOS;
  checks checkout, link creation/reuse, ownership, signed callback, PAID/SUCCEEDED,
  ACTIVE class/session private links, denied foreign access and ADMIN reconciliation.
- Whitespace diff: pass. No commit/push/deploy or real transfer.

## Repeatable fixture smoke

Use a new disposable PostgreSQL container and an explicitly named local database
`mindy_fe_phase22_test`; never use the application database. Backend HTTP fixture
derives/resets only `mindy_fe_phase22_http_test`. Build companion BE and FE first.
Then run `scripts/payment-fixture-smoke.mjs` in the FE directory with TEST_DATABASE_URL
pointing to that disposable container. It starts/stops its own backend fixture and
FE production server on port 3187, uses test-only keys/provider credentials, and
does not call real PayOS. The script requires BE dependencies installed locally.

The audit used PostgreSQL 16, host port 5544 and container
`mindy-fe-phase22-audit`; the container was removed after verification. Existing
manual PostgreSQL/Mailpit and BE local runtime were preserved.

For browser checks, a temporary ignored Playwright config used port 3102 because
3101 was occupied. This changes no application configuration. Screenshots from
the new journeys are available under `test-results/phase22-*.png` after rerunning.

## Deferred

`/payment/result` return/cancel mapping needs the BE contract for locating the
internal order. Cash mentor confirmation/pending preview, enrollment list and
progress read/write APIs remain unavailable. Materials/attendance/chat/dashboard
are later milestones. Real-provider settlement, external SMTP and VPS routing
have not been validated by these fixture tests.
