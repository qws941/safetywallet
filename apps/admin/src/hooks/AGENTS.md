# AGENTS: HOOKS

## SCOPE

- Admin data-access hook layer (`src/hooks`).
- Query/mutation orchestration, query keys, invalidation boundaries.

## CURRENT INVENTORY

- Hook module count: `31` (`use-*.ts`, excludes tests/AGENTS).
- Core barrel files: `use-api.ts`, `use-api-base.ts`.

## HOOK GROUPS

- Admin split modules: `use-admin-dashboard-api.ts`, `use-admin-members-api.ts`, `use-admin-announcements-api.ts`, `use-admin-approvals-api.ts`, `use-admin-audit-api.ts`, `use-admin-sites-api.ts`.
- Aggregated admin entry: `use-admin-api.ts`.
- Posts/actions: `use-posts-api.ts`, `use-actions-api.ts`.
- Attendance/sync: `use-attendance.ts`, `use-fas-sync.ts`, `use-sync-errors.ts`.
- Votes/recommendations/rewards: `use-votes.ts`, `use-recommendations.ts`, `use-rewards.ts`.
- Monitoring/analytics: `use-monitoring-api.ts`, `use-trends.ts`, `use-stats.ts`.
- Points split: `use-points-api.ts`, `use-points-ledger-api.ts`, `use-points-policies-api.ts`, `use-points-settlement-api.ts`.
- Education split: `use-education-api.ts`, `use-education-api-types.ts`, `use-education-contents-api.ts`, `use-education-quizzes-api.ts`, `use-education-statutory-api.ts`, `use-education-tbm-api.ts`.
- Site profile: `use-sites-api.ts`.

## PATTERNS

- Site-aware query `enabled` guards avoid requests before `currentSiteId` hydration.
- Mutation hooks invalidate narrow query key scopes (domain-first keys).
- API transport centralized through `apiFetch` from `src/lib/api.ts`.
- Split-domain modules reduce monolithic hook growth while preserving aggregated compatibility exports.

## BARREL BOUNDARY

- `use-api.ts` re-exports selected compatibility modules only.
- Not re-exported (direct import required):
  - `use-votes.ts`
  - `use-recommendations.ts`
  - `use-trends.ts`
  - `use-stats.ts`

## KNOWN CONSTRAINTS

- `use-monitoring-api.ts` uses `monitoring/*` query-key namespace; intentionally differs from many `admin/*` keys.
- `use-votes.ts` includes CSV export `fetch` path for blob download; this edge behavior remains localized.
- Keep API path constants and auth refresh handling in `src/lib/api.ts`; do not replicate per hook.

## TEST LINK

- `__tests__/AGENTS.md` defines hook test harness, mocking strategy, and invalidation assertions.
