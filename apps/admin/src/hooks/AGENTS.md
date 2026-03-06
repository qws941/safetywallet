# Hooks

## PURPOSE

- Own the admin data-access layer in `src/hooks`.
- Define query/mutation boundaries and module grouping.

## FILE INVENTORY

- Hook module files: `42` (`use-*.ts`).
- Test/util docs in this folder: `AGENTS.md`, `__tests__/`.
- Barrel/transport boundary files:
  - `use-api.ts`
  - `use-api-base.ts`

## MODULE GROUPS

- Admin API split:
  - `use-admin-api.ts`
  - `use-admin-dashboard-api.ts`
  - `use-admin-members-api.ts`
  - `use-admin-announcements-api.ts`
  - `use-admin-approvals-api.ts`
  - `use-admin-audit-api.ts`
  - `use-admin-sites-api.ts`
- Route domain hooks:
  - posts/actions/issues: `use-posts-api.ts`, `use-actions-api.ts`, `use-issues-api.ts`
  - attendance/sync: `use-attendance.ts`, `use-fas-sync.ts`, `use-sync-errors.ts`
  - votes/recommendations/rewards: `use-votes.ts`, `use-recommendations.ts`, `use-rewards.ts`
  - monitoring/stats: `use-monitoring-api.ts`, `use-trends.ts`, `use-stats.ts`
  - points: `use-points-api.ts`, `use-points-ledger-api.ts`, `use-points-policies-api.ts`, `use-points-settlement-api.ts`
  - education: `use-education-api.ts`, `use-education-api-types.ts`, `use-education-completions.ts`, `use-education-contents-api.ts`, `use-education-quizzes-api.ts`, `use-education-statutory-api.ts`, `use-education-tbm-api.ts`
  - site lookup: `use-sites-api.ts`
- AI-assisted modules (admin tooling):
  - `use-ai-analysis.ts`, `use-action-ai-analysis.ts`, `use-announcement-ai-draft.ts`
  - `use-before-after-comparison.ts`, `use-post-classification.ts`, `use-quiz-generation.ts`
  - `use-education-ai-analysis.ts`, `use-tbm-ai-analysis.ts`, `use-tbm-meeting-minutes.ts`

## CONVENTIONS

- TanStack Query owns request caching, staleness, and mutation invalidation.
- Site-dependent hooks gate execution until `currentSiteId` is hydrated.
- API transport is centralized through `apiFetch` from `src/lib/api.ts`.
- Query keys are domain-first and invalidated narrowly.
- `use-api.ts` remains a compatibility barrel, not a required import path for every module.

## ANTI-PATTERNS

- Duplicating auth refresh, API base, or token handling inside hook modules.
- Adding hidden side effects in selector hooks that bypass explicit mutations.
- Expanding barrel exports without checking tree-shaking and existing direct-import contracts.

## TEST LINK

- `__tests__/AGENTS.md` documents the `19` hook test files and shared harness.
