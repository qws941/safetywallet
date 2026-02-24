# AGENTS: HOOKS

## PURPOSE

Admin data-access hooks. Scope: query/mutation wrappers, barrel boundary, site-aware gating.

## KEY FILES

| File                            | Domain                  | Notes                                          |
| ------------------------------- | ----------------------- | ---------------------------------------------- |
| `use-admin-api.ts`              | dashboard/admin common  | members, announcements, approvals, memberships |
| `use-posts-api.ts`              | posts review            | list/detail/review mutations                   |
| `use-actions-api.ts`            | actions                 | action item CRUD                               |
| `use-attendance.ts`             | attendance              | logs + unmatched endpoints                     |
| `use-points-api.ts`             | points/policies         | ledger and policy mutations                    |
| `use-education-api.ts`          | education               | contents/quizzes/questions/statutory/TBM       |
| `use-sites-api.ts`              | site profile            | site read/update                               |
| `use-monitoring-api.ts`         | operations metrics      | summary/metrics/top-errors + 60s polling       |
| `use-rewards.ts`                | reward rankings/history | revoke and ranking reads                       |
| `use-fas-sync.ts`               | FAS integration ops     | status/search/sync/debug views                 |
| `use-sync-errors.ts`            | sync error review       | error list/update                              |
| `use-votes.ts`                  | vote domain             | period/candidate/results + CSV export helper   |
| `use-recommendations.ts`        | recommendations         | recommendation workflows                       |
| `use-trends.ts`, `use-stats.ts` | analytics helpers       | trend and stat retrieval                       |
| `use-api.ts`                    | barrel exports          | compatibility export set                       |
| `use-api-base.ts`               | `apiFetch` re-export    | shared import boundary                         |

## PATTERNS

| Pattern                     | Applied in     | Notes                                    |
| --------------------------- | -------------- | ---------------------------------------- |
| Site-aware `enabled` guards | most hooks     | wait for `currentSiteId` before querying |
| Mutation invalidation       | mutation hooks | invalidate targeted admin query roots    |
| Typed response unwrapping   | domain hooks   | normalize API payload shapes for pages   |

## GOTCHAS

- `use-api.ts` barrel exports 12 modules; it omits `use-votes.ts`, `use-recommendations.ts`, `use-trends.ts`, `use-stats.ts`.
- `use-monitoring-api.ts` query keys are `monitoring/*` (no `admin` prefix), unlike most hooks.
- `use-votes.ts` includes direct `fetch` in CSV export helper for blob download; keep this edge path isolated.

## TEST DOC LINK

- `__tests__/AGENTS.md` documents hook test harness, mocks, and invalidation assertions.

## PARENT DELTA

- Parent admin doc only names hooks area.
- This file defines actual module inventory and barrel/non-barrel boundaries.
