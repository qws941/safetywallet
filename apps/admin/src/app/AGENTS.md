# AGENTS: APP ROUTES

## SCOPE

- `apps/admin/src/app` route layer only.
- App Router pages, route errors, route-local helpers/components.
- No hook/store internals (documented in sibling AGENTS files).

## ROUTE SYSTEM FACTS

- Total route pages: `30` (`**/page.tsx`).
- Root redirect: `page.tsx` -> `/dashboard`.
- Shared wrappers: `layout.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`.
- CSS entry: `globals.css`.
- Flat route tree (no active `(dashboard)` group directory).

## PAGE GROUPS

- Core: `dashboard`, `dashboard/analytics`, `dashboard/recommendations`.
- Operations: `attendance`, `attendance/sync`, `attendance/unmatched`, `monitoring`, `sync-errors`.
- Content: `posts`, `posts/[id]`, `actions`, `announcements`.
- Voting: `votes`, `votes/new`, `votes/candidates`, `votes/[id]`, `votes/[id]/candidates/new`.
- Governance: `approvals`, `audit`, `recommendations`, `settings`.
- Members and rewards: `members`, `members/[id]`, `rewards`.
- Points: `points`, `points/policies`, `points/settlement`.
- Training: `education`.
- Auth: `login`.

## ROUTE-LOCAL FILES

- Attendance: `attendance/components/*`, `attendance-helpers.ts`.
- Votes: `votes/components/*`, `votes-helpers.ts`.
- Education: `education/components/*`, `education-helpers.ts`.
- Posts detail: `posts/[id]/post-detail.tsx` + `components/*` + helper.

## PATTERNS

- Dynamic wrappers for static export:
  - `posts/[id]/page.tsx`
  - `votes/[id]/page.tsx`
  - `votes/[id]/candidates/new/page.tsx`
  - `members/[id]/page.tsx`
- Wrapper pages use placeholder `generateStaticParams` and hand off to client components.
- Feature pages keep orchestration in `page.tsx`; UI blocks in `components/*`.

## SECTION DOC LINKS

- `attendance/AGENTS.md` - logs/unmatched/sync behavior.
- `posts/AGENTS.md` - post review list/detail.
- `votes/AGENTS.md` - month-period vote workflows.
- `education/AGENTS.md` - education tab architecture.

## GOTCHAS

- `attendance/page.tsx` already renders unmatched tab state; deep-link unmatched page still required.
- `approvals/page.tsx` is active; avoid stale docs marking it as placeholder.
- Static export compatibility depends on wrapper routes staying lightweight.
