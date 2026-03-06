# Admin Dashboard

Next.js 15 admin dashboard app (App Router, static export), served from `admin.*` via R2 `ASSETS`.

## PURPOSE

- Define admin app boundaries and current folder ownership.
- Keep route/component/data-layer inventories aligned with the live tree.

## FILE INVENTORY

- `src/app/` - route layer with `31` route pages (`**/page.tsx`) across `18` top-level route directories.
- `src/components/` - shared shell, providers, sidebar, table, and feature component packs.
- `src/hooks/` - `42` hook modules (`use-*.ts`) including TanStack Query domain hooks and AI helper hooks.
- `src/stores/` - Zustand auth store (`auth.ts`) with persisted key `safetywallet-admin-auth`.
- `src/lib/` - API wrapper (`api.ts`) and utility boundary (`utils.ts`).
- Entry integration points:
  - `src/app/layout.tsx`
  - `src/components/admin-shell.tsx`
  - `src/components/providers.tsx`
  - `src/components/sidebar.tsx`
  - `src/stores/auth.ts`
  - `src/lib/api.ts`

## ROUTE GROUPS

- Core dashboard: `dashboard`, `dashboard/analytics`, `dashboard/recommendations`.
- Operations: `attendance`, `attendance/sync`, `attendance/unmatched`, `monitoring`, `sync-errors`.
- Reviews/content: `posts`, `posts/[id]`, `actions`, `announcements`, `issues`.
- Voting: `votes`, `votes/new`, `votes/candidates`, `votes/[id]`, `votes/[id]/candidates/new`.
- Governance/admin: `approvals`, `audit`, `recommendations`, `settings`, `login`.
- Members/rewards: `members`, `members/[id]`, `rewards`.
- Points: `points`, `points/policies`, `points/settlement`.
- Education: `education` (single-page tabbed hub).

## CONVENTIONS

- Route pages are client-first and use `"use client"` where browser state or hooks are required.
- Dynamic route wrappers keep static export compatibility with minimal `generateStaticParams` placeholders.
- Data fetching/mutations flow through hooks (TanStack Query); page files orchestrate layout/state only.
- API requests use `apiFetch` from `src/lib/api.ts`; authenticated flows rely on centralized 401 refresh/retry.
- Site-scoped behavior reads `currentSiteId` from `useAuthStore`.
- Sidebar stays mounted (`w-16` mobile rail, `md:w-64` desktop expansion).

## ANTI-PATTERNS

- Duplicating auth refresh or token lifecycle logic outside `src/lib/api.ts` and `src/stores/auth.ts`.
- Adding route-level server dependencies that break static export wrappers.
- Re-implementing query invalidation in page components instead of hook mutation layers.
- Mixing non-admin scopes (`apps/api`, `apps/worker`) into this subtree documentation.

## CHILD AGENTS

- `src/app/AGENTS.md` - route topology, wrapper pattern, and page grouping.
- `src/app/attendance/AGENTS.md` - attendance logs/unmatched/sync surfaces.
- `src/app/education/AGENTS.md` - education tab hub internals.
- `src/app/posts/AGENTS.md` - post list/detail review workflow.
- `src/app/votes/AGENTS.md` - month-period vote lifecycle.
- `src/components/AGENTS.md` - shared component inventory.
- `src/hooks/AGENTS.md` - hook-module ownership and boundaries.
- `src/hooks/__tests__/AGENTS.md` - hook verification inventory.
- `src/stores/AGENTS.md` - auth store contract.
- `src/lib/AGENTS.md` - API wrapper contract.
