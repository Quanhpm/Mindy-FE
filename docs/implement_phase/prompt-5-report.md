# Prompt 5 — Public catalog handoff

Backend source verified unchanged at `feat(api)/booking-sprint` / `577af2f`.
Read current AGENTS, architecture/contracts/progress/UI rules, Prompt 5, public
controllers/DTO/service, saved Ocean courses reference and Coursera unit image.

Implemented public routes: `/courses`, `/courses/[courseId]`,
`/courses/[courseId]/units/[unitId]`, `/classes/[classId]`. Public GET reads use the
same-origin adapter and runtime schemas. Course and class response contracts stay
separate from management fields. The public class DTO has no price: the page reads
its course to display the authoritative course price. Private meeting URLs,
management status, unit unlock/progress fields and session classUnitId are stripped
from parsed public responses and never rendered.

Course list uses URL categoryId/deliveryMode/startsFrom/startsTo/page/pageSize;
course class list uses the latter filters without categoryId. No search, level or
price sort is sent. Category pickers exhaust pagination. Form date ranges validate
before submit; date-only values retain calendar dates. Sessions display project
timezone. Course detail uses the paginated course-classes endpoint rather than
assuming the first openClasses array covers all classes.

Unit viewer reuses UnitWorkspace with a 300px rail, independent scrolling regions,
real titles/descriptions/score metadata, URL path selection, accessible selected
links, reload/history, invalid unit state, empty-description state and keyboard
mobile drawer. Public class detail uses the same workspace for units/timetable
with query selection; no fictional learning state or meeting link is added.

`catalog -> cart/client` is the approved public dependency. AddToCartButton receives
classId/returnTo/full availability; its cart/session owner handles STUDENT role,
login return path, duplicate/full/unavailable recovery and exact `{ classId }` adds.
Root supplies PublicShell/providers, proxy rules, safeReturnTo and shared docs.
Public layout follows Ocean Editorial tokens/font, 1280px content maximum,
responsive course grid and white CTA region within dark price summary.

Validation at handoff: catalog unit suite **19 passed** (12 previous + 7 public
schema/API tests), scoped Biome and module boundaries passed. TypeScript source has
no errors; temporary generated Next dev/production LayoutRoutes mismatch awaits
root typegen/build. Root owns the combined production build/E2E/visual review.
Six mock E2E scenarios cover real queries/pagination, course/private DTO safety,
student add payload, anonymous login return, full/nonstudent guard, 404/date errors,
unit rail/history/invalid/empty/mobile keyboard and overflow at 1440/768/390/375.
They save public courses/course detail/class/unit mock PNGs at 1440 and 390 under
`docs/implement_phase/screenshots`; final browser evidence is pending root run.

Live public/cart smoke has not run here. No backend, unrelated changes, commits,
pushes or deployments were made. This is public syllabus/timetable browsing;
private learning/progress/payment are still outside the implemented API scope.

## Final combined verification — 2026-10-02

Root `pnpm check` passed with pinned Node 22.20.0/pnpm 12.6.0, 109 unit tests and
production build. Full mocked Chromium suite: 43 passed; final checkout/public
catalog rerun: 13 passed, including 6 public scenarios. Desktop/mobile screenshot
visual review and 1440/768/390/375 overflow/keyboard checks passed. Earlier
pending browser/build notes are superseded by this evidence. Live BE/
Google/SMTP remain unverified for the blockers in
[combined report](./IMPLEMENTATION_PROMPTS_5_8.md).
