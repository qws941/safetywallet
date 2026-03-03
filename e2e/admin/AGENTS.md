# AGENTS: E2E/ADMIN

## SCOPE DELTA

- Admin dashboard browser tests only.
- Shared E2E policy lives in `e2e/AGENTS.md`.

## CURRENT INVENTORY

- Total TS files: 32.
- Support files: `admin.setup.ts`, `helpers.ts`.
- Spec files: 30 (`*.spec.ts`).

## SPEC SET (30)

- auth + shell: `smoke`, `login`, `auth`, `navigation`, `pages`, `dashboard`.
- post/content: `posts`, `post-detail`, `announcements`.
- people/attendance: `members`, `member-detail`, `attendance`, `attendance-sync`, `attendance-unmatched`.
- points/rewards: `points`, `points-policies`, `points-settlement`, `rewards`.
- governance/ops: `actions`, `approvals`, `audit`, `monitoring`, `settings`, `sync-errors`.
- UX/visual: `mobile-visual`, `uiux-after-login`.
- feature slices: `recommendations`, `dashboard-recommendations`, `dashboard-analytics`, `votes`.

## MODULE RULES

- Use `admin.setup.ts` storage-state bootstrap for authenticated project runs.
- Reuse helpers (`adminLogin`, shell/sidebar checks) instead of copy-paste login flows.
- Keep Korean UI assertions explicit for login/shell critical paths.
- Keep selector/wait strategy locator-first; avoid fixed sleep timing.
- Keep base URL sourced from Playwright config/env, never hardcoded per spec.

## ANTI-DRIFT

- No stale spec count/list.
- No duplicate auth bootstrap logic outside setup/helper.
- No deleted spec references (for example legacy `hamburger.spec.ts`).
