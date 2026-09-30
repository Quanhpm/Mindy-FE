# Mindy frontend conventions

Read `docs/architecture.md`, `docs/api-contracts.md`, and `docs/progress.md` before changing features.
The companion backend is `../Mindy-BE`, currently referenced at dev/b500dbf.

- Keep route composition in `app`, business UI in `features`, reusable primitives in `shared`.
- Use feature public entry points. `users -> auth/client` is the only initial cross-feature dependency.
- Do not import NestJS entities or database libraries. Backend owns authentication, authorization and transactions.
- Use kebab-case filenames, TypeScript strict, explicit boundary types, and runtime validation.
- Send browser requests through the same-origin `/api/v1` adapter. Never persist raw tokens in browser storage.
- Match real backend DTOs and permissions. Planned endpoints are not implemented endpoints.
- Create only folders/files with real consumers. Keep future phases in the roadmap.
- Document API changes, update `docs/progress.md`, and run the appropriate checks before completion.
- Commit messages follow Conventional Commits; do not commit local environment files.
