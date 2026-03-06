# App Routes

## PURPOSE

- Document the App Router surface in `src/app`.
- Track route-page and wrapper patterns used by the admin frontend.

## FILE INVENTORY

- Shared app files:
  - `layout.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`
  - `globals.css`, root `page.tsx`
  - `page.test.tsx`, `not-found.test.tsx`
- Top-level route directories (`18`):
  - `actions`, `announcements`, `approvals`, `attendance`, `audit`
  - `dashboard`, `education`, `issues`, `login`, `members`
  - `monitoring`, `points`, `posts`, `recommendations`, `rewards`
  - `settings`, `sync-errors`, `votes`
- Route page count: `31` (`**/page.tsx`).

## PAGE GROUPS

- Core dashboards: `dashboard`, `dashboard/analytics`, `dashboard/recommendations`.
- Operations: `attendance`, `attendance/sync`, `attendance/unmatched`, `monitoring`, `sync-errors`.
- Review/content: `posts`, `posts/[id]`, `actions`, `announcements`, `issues`.
- Voting: `votes`, `votes/new`, `votes/candidates`, `votes/[id]`, `votes/[id]/candidates/new`.
- Governance/admin: `approvals`, `audit`, `recommendations`, `settings`.
- Members/rewards: `members`, `members/[id]`, `rewards`.
- Points: `points`, `points/policies`, `points/settlement`.
- Education and auth: `education`, `login`.

## CONVENTIONS

- Root `page.tsx` redirects to `/dashboard`.
- Dynamic routes are thin wrappers for static export:
  - `posts/[id]/page.tsx`
  - `votes/[id]/page.tsx`
  - `votes/[id]/candidates/new/page.tsx`
  - `members/[id]/page.tsx`
- Wrapper pages keep params extraction + client handoff only.
- Route-local helper modules stay near the owning route tree.
- Feature-heavy routes split JSX into local `components/` folders.

## ANTI-PATTERNS

- Moving data fetching logic into shared route wrappers.
- Collapsing route-local helper files into unrelated global modules.
- Introducing server-only dependencies in wrapper routes intended for static export.

## CHILD AGENT LINKS

- `attendance/AGENTS.md`
- `posts/AGENTS.md`
- `votes/AGENTS.md`
- `education/AGENTS.md`
