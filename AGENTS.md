# Mindy frontend conventions

Read `docs/architecture.md`, `docs/api-contracts.md`, and `docs/progress.md` before changing features.
Before creating or changing any UI, also read and follow [docs/ui-rules.md](docs/ui-rules.md).
The user requested a complete UI replacement on 06/10/2026. Read UI.md for the new Mindy design. Global colors live in src/shared/config/theme.ts; use the docs logo and palettes. Keep public/auth/student layouts distinct; admin uses MindyAdminShell with sidebar and workspace. Old preview routes redirect home. Preserve business logic.
The companion backend is `../Mindy-BE`. Identity/catalog/classes/payments now target `Feat/Webhooktest` at `5c9e581`
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
