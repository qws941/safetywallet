# Hook Tests

## PURPOSE

- Document ownership of hook-level test coverage in `src/hooks/__tests__`.

## INVENTORY

- Root files (`21` files, `20` TS/TSX):
  - `AGENTS.md`
  - `test-utils.tsx`
  - `use-actions-api.test.ts`
  - `use-admin-api.test.ts`
  - `use-api-base.test.ts`
  - `use-api.test.ts`
  - `use-attendance.test.ts`
  - `use-education-api.test.ts`
  - `use-education-completions.test.ts`
  - `use-fas-sync.test.ts`
  - `use-issues-api.test.ts`
  - `use-monitoring-api.test.ts`
  - `use-points-api.test.ts`
  - `use-posts-api.test.ts`
  - `use-recommendations.test.ts`
  - `use-rewards.test.ts`
  - `use-sites-api.test.ts`
  - `use-stats.test.ts`
  - `use-sync-errors.test.ts`
  - `use-trends.test.ts`
  - `use-votes.test.ts`

## CONVENTIONS

- Use `test-utils.tsx` QueryClient wrapper for `renderHook` consistency.
- Mock transport at `@/lib/api` or `@/hooks/use-api-base` boundary.
- Stub auth-store state (`currentSiteId`, hydration, role flags) per suite.
- Assert mutation invalidation/query key interactions when mutation exists.
- Keep barrel test (`use-api.test.ts`) export-contract focused.

## ANTI-PATTERNS

- Treating barrel tests as replacement for domain behavior tests.
- Using real network/timer dependencies in unit suites.
- Skipping key state assertions in mutation-heavy test files.
- Adding broad snapshot-only tests for data hooks.

## DRIFT GUARDS

- On new hook module, add or update matching test suite.
- Keep root file count accurate (`21` files, `0` subdirs).
- Keep `test-utils.tsx` API stable; update callers together when changing wrapper.
- Remove stale tests when corresponding hook modules are deleted.
