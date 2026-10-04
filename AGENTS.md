# Mindy frontend conventions

Read `docs/architecture.md`, `docs/api-contracts.md`, and `docs/progress.md` before changing features.
Before creating or changing any UI, also read and follow [docs/ui-rules.md](docs/ui-rules.md).
Ocean Editorial (layout 07) is the selected design standard for new feature UI.
The companion backend is `../Mindy-BE`. Identity/catalog/classes now target `feat(api)/booking-sprint` at `577af2f`
(verify current source before extending integration).
For the eight-session integration handoff and required course-unit split layout,
read `docs/implement_phase/PROMPTS_BACKEND_INTEGRATION.md`.

- Keep route composition in `app`, business UI in `features`, reusable primitives in `shared`.
- Use feature public entry points. Approved client dependencies are listed in
  `docs/architecture.md` and enforced by `scripts/check-boundaries.mjs`.
- Do not import NestJS entities or database libraries. Backend owns authentication, authorization and transactions.
- Use kebab-case filenames, TypeScript strict, explicit boundary types, and runtime validation.
- Send browser requests through the same-origin `/api/v1` adapter. Never persist raw tokens in browser storage.
- Match real backend DTOs and permissions. Planned endpoints are not implemented endpoints.
- Create only folders/files with real consumers. Keep future phases in the roadmap.
- Document API changes, update `docs/progress.md`, and run the appropriate checks before completion.
- Commit messages follow Conventional Commits; do not commit local environment files.
