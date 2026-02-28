# AGENTS: HOOKS/**TESTS**

## PURPOSE

Hook unit-test layer. Scope: hook behavior, endpoint/query-key correctness, invalidation side-effects.

## KEY FILES

| File                         | Coverage focus   | Notes                                         |
| ---------------------------- | ---------------- | --------------------------------------------- |
| `test-utils.tsx`             | shared wrapper   | QueryClient setup for `renderHook`            |
| `use-api.test.ts`            | barrel integrity | export surface assertions                     |
| `use-admin-api.test.ts`      | admin core hooks | site gating + approval/announcement mutations |
| `use-attendance.test.ts`     | attendance hooks | URL param construction and unmatched flows    |
| `use-monitoring-api.test.ts` | monitoring hooks | query string generation + cache keys          |
| `use-fas-sync.test.ts`       | FAS hooks        | status fallback + sync mutation behaviors     |
| `use-votes.test.ts`          | vote hooks       | period/candidate/result and invalidations     |
| `use-education-api.test.ts`  | education hooks  | content/quiz mutations and payload handling   |

## PATTERNS

| Pattern                 | Applied in                  | Notes                                          |
| ----------------------- | --------------------------- | ---------------------------------------------- |
| Boundary mocking        | most suites                 | mock `@/lib/api` or `@/hooks/use-api-base`     |
| Store selector stubbing | site-aware hooks            | provide `currentSiteId`, hydration, role flags |
| Invalidation assertions | mutation suites             | spy on `queryClient.invalidateQueries`         |
| URL string checks       | attendance/monitoring tests | verify serialized query params                 |

## GOTCHAS

- Old references to `use-auth.test.ts` or `use-site-context.test.ts` are stale; these files do not exist.
- `use-api.test.ts` intentionally checks the barrel only; non-barrel hooks need direct-module tests.
- Some test files contain encoded line prefixes in tool output; source files remain standard TS.

## PARENT DELTA

- Parent hooks doc maps runtime hook modules.
- This file adds test harness and per-suite verification responsibilities.
