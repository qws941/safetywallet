# Hook Tests

## PURPOSE

- Document ownership of hook-level test coverage in `src/hooks/__tests__`.

## FILE INVENTORY

- Total entries: `21`.
- Test files: `19` (`*.test.ts`).
- Non-test support files:
  - `test-utils.tsx`
  - `AGENTS.md`
- Test suites present:
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
- Stub auth-store state (`currentSiteId`, hydration, role flags) explicitly per suite.
- Verify mutation side effects via query invalidation assertions.
- Keep barrel tests (`use-api.test.ts`) focused on export contract only.

## ANTI-PATTERNS

- Treating barrel tests as replacement for domain behavior tests.
- Using real network/time dependencies in unit tests.
- Skipping query-key assertions in mutation-heavy suites.
