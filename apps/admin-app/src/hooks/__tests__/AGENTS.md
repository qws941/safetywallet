# AGENTS: HOOKS/**TESTS**

## OVERVIEW

Hook-level unit tests for admin query/mutation behavior and cache invalidation rules.

## WHERE TO LOOK

| Task                 | File Pattern                                                            | Notes                                |
| :------------------- | :---------------------------------------------------------------------- | :----------------------------------- |
| API query hooks      | `use-*-api.test.ts`                                                     | query keys, endpoints, enabled flags |
| Domain hooks         | `use-attendance.test.ts`, `use-votes.test.ts`, `use-points-api.test.ts` | business filters and pagination      |
| Auth-dependent hooks | `use-auth.test.ts`, `use-site-context.test.ts`                          | store selector behavior and gating   |

## CONVENTIONS

- Use `renderHook` + shared wrapper for query client context.
- Mock `apiFetch` at boundary; assert exact endpoint path and params.
- Mock Zustand selectors with explicit test state objects (`currentSiteId`, hydrate flags).
- Verify mutation side-effects by asserting `invalidateQueries` calls and target query keys.
- Keep test names behavior-first (`returns`, `filters`, `invalidates`) instead of implementation wording.

## ANTI-PATTERNS

- No real network calls and no environment-dependent base URL assumptions.
- No opaque snapshots for hook return objects.
- No coupling to hook execution order across unrelated suites.

## NOTES

- Parent guidance remains in `apps/admin-app/src/hooks/AGENTS.md`; this file is test-only delta.
