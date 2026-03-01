## Naming Conventions

- Workspace package names: `@safetywallet/{dir}` and `{dir}` must be kebab-case (`scripts/lint-naming.js`).
- Root package name: `safetywallet` (`scripts/lint-naming.js`, `package.json`).
- i18n keys: `section.keyName` with camelCase key segment (e.g., `login.errorUserNotFound`) (`packages/types/i18n.md`).
- Tests: colocated `__tests__` directories and `*.test.ts(x)` naming; E2E uses `*.spec.ts` under `e2e/`.

## File Organization

- Apps live under `apps/` with App Router pages under `src/app/` (`apps/admin/src/app/`, `apps/worker/src/app/`).
- Shared packages under `packages/` (`packages/types/src`, `packages/ui/src`).
- E2E tests live under `e2e/` with per-surface folders (`e2e/api`, `e2e/admin`, `e2e/worker`, `e2e/cross-app`).
- Repo tooling and verification scripts live under `scripts/` (`scripts/verify.sh`, `scripts/lint-naming.js`).

## Import Style

- ES module syntax is used across workspaces (`"type": "module"` in `apps/api/package.json`, `apps/admin/package.json`, `apps/worker/package.json`).
- Workspace-local imports reference `@safetywallet/types` and `@safetywallet/ui` (`apps/admin/package.json`, `apps/worker/package.json`).

## Code Patterns

- API validation: Zod-based validation via Hono middleware (`apps/api/package.json`).
- Data access: Drizzle ORM for D1 in API worker (`apps/api/package.json`).
- UI state/query: Zustand + TanStack Query in admin/worker apps (`apps/admin/package.json`, `apps/worker/package.json`).
- i18n: UI text sourced from `packages/types/src/i18n/` (`packages/types/i18n.md`).

## Error Handling

- Anti-patterns are explicitly disallowed: `as any`, `@ts-ignore`, `@ts-expect-error`, and empty `catch {}` (see `AGENTS.md`).
- Prefer typed errors and preserve TypeScript strictness (`packages/types/tsconfig.json`).

## Logging

- ELK index prefix must be configurable via `ELASTICSEARCH_INDEX_PREFIX` (`docs/requirements/ELK_INDEX_PREFIX_REQUIREMENTS.md`).
- Logging paths in the API worker should follow the shared prefix rules defined in requirements (`docs/requirements/ELK_INDEX_PREFIX_REQUIREMENTS.md`).

## Testing

- Unit tests: Vitest workspace config (`vitest.config.ts`) and per-package configs (`apps/*/vitest.config.ts`, `packages/*/vitest.config.ts`).
- E2E: Playwright projects in `playwright.config.ts`, tests under `e2e/`.
- Scripts: `npm test`, `npm run test:e2e`, `npm run test:e2e:smoke` (`package.json`).

## Do's and Don'ts

- Do keep naming consistent with `scripts/lint-naming.js` and run `npm run lint:naming` for new packages.
- Do use i18n keys from `packages/types/src/i18n/` instead of hardcoded UI strings (`packages/types/i18n.md`).
- Do use `npm run typecheck` before merging TypeScript changes (`package.json`).
- Don't run manual deploy commands; deploy is CI-only (`package.json`, `apps/api/package.json`, `docs/cloudflare-operations.md`).
- Don't suppress type errors or use empty catch blocks (`AGENTS.md`).
