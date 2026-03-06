# Hooks

## PURPOSE

- Own the admin data-access layer in `src/hooks`.
- Define query/mutation boundaries and module grouping.

## INVENTORY

- Root files (`44` files, `43` TS/TSX):
  - `AGENTS.md`
  - `use-api.ts`
  - `use-api-base.ts`
  - `use-admin-api.ts`
  - `use-admin-dashboard-api.ts`
  - `use-admin-members-api.ts`
  - `use-admin-announcements-api.ts`
  - `use-admin-approvals-api.ts`
  - `use-admin-audit-api.ts`
  - `use-admin-sites-api.ts`
  - `use-ai-insights-api.ts`
  - `use-attendance.ts`
  - `use-fas-sync.ts`
  - `use-sync-errors.ts`
  - `use-posts-api.ts`
  - `use-actions-api.ts`
  - `use-issues-api.ts`
  - `use-votes.ts`
  - `use-recommendations.ts`
  - `use-rewards.ts`
  - `use-monitoring-api.ts`
  - `use-stats.ts`
  - `use-trends.ts`
  - `use-sites-api.ts`
  - `use-points-api.ts`
  - `use-points-ledger-api.ts`
  - `use-points-policies-api.ts`
  - `use-points-settlement-api.ts`
  - `use-education-api.ts`
  - `use-education-api-types.ts`
  - `use-education-completions.ts`
  - `use-education-contents-api.ts`
  - `use-education-quizzes-api.ts`
  - `use-education-statutory-api.ts`
  - `use-education-tbm-api.ts`
  - AI analysis hooks: `use-ai-analysis.ts`, `use-action-ai-analysis.ts`, `use-announcement-ai-draft.ts`, `use-before-after-comparison.ts`, `use-post-classification.ts`, `use-quiz-generation.ts`, `use-education-ai-analysis.ts`, `use-tbm-ai-analysis.ts`, `use-tbm-meeting-minutes.ts`
- Subdirs (`1`):
  - `__tests__/`

## CONVENTIONS

- TanStack Query owns request caching, staleness, and mutation invalidation.
- Site-dependent hooks gate execution until `currentSiteId` is hydrated.
- API transport is centralized through `apiFetch` from `src/lib/api.ts`.
- Query keys are domain-first and invalidated narrowly.
- `use-api.ts` remains a compatibility barrel, not a required import path for every module.
- Keep API DTO typing in hook files or hook-local types; avoid route-level type drift.

## ANTI-PATTERNS

- Duplicating auth refresh, API base, or token handling inside hook modules.
- Adding hidden side effects in selector hooks that bypass explicit mutations.
- Expanding barrel exports without checking tree-shaking and existing direct-import contracts.
- Leaving new hook modules untested in `__tests__/` when behavior is non-trivial.

## DRIFT GUARDS

- On adding/removing a `use-*.ts` file, update root file count and list.
- Keep `use-ai-insights-api.ts` aligned with `src/app/ai-insights/` route usage.
- Ensure query key naming remains domain-first after refactors.
- Keep `__tests__/AGENTS.md` test inventory synchronized with hook changes.
