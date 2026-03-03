# AGENTS: HOOK TESTS

## SCOPE

- Unit tests for admin hook modules (`src/hooks/__tests__`).
- Validates query/mutation behavior, URL/query-key construction, invalidation side effects.

## TEST DIRECTORY FACTS

- Test files in folder: `19` entries total including `AGENTS.md` + shared utils.
- Shared test harness: `test-utils.tsx` (QueryClient wrapper for `renderHook`).

## MAJOR SUITES

- Barrel/export surface: `use-api.test.ts`, `use-api-base.test.ts`.
- Admin aggregate: `use-admin-api.test.ts`.
- Domain suites:
  - `use-actions-api.test.ts`
  - `use-attendance.test.ts`
  - `use-education-api.test.ts`
  - `use-fas-sync.test.ts`
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

## TEST PATTERNS

- Mock boundary at transport layer (`@/lib/api` or `@/hooks/use-api-base`).
- Stub auth store selectors for `currentSiteId`, hydration, role flags.
- Assert query invalidation calls for mutation hooks.
- Validate URL/query-string serialization in list/filter hooks.
- Keep non-barrel hooks covered by direct-module suites.

## CONSTRAINTS

- `use-api.test.ts` checks barrel exports only; it is not a replacement for domain behavior tests.
- Keep tests deterministic (no real network, no wall-clock dependency).
- Prefer explicit query-key assertions where cache behavior is contract-critical.

## RELATION TO PARENT DOC

- `src/hooks/AGENTS.md` describes runtime hook inventory and boundaries.
- This file describes verification strategy and test ownership.
