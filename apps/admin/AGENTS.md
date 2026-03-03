# AGENTS: ADMIN-APP

## SCOPE

- Admin dashboard app root (`apps/admin`).
- Covers route tree, UI composition, hooks, store, utilities.
- Child AGENTS files own module detail; this file stays integration-level.

## CURRENT FACTS

- Framework: Next.js 15 App Router (`next@15.5.10`, React 18).
- Dev/start port: `3001` (`next dev -p 3001`, `next start -p 3001`).
- Build mode: static export (`next.config.js` -> `output: "export"`).
- Admin routes: `30` `page.tsx` files under `src/app`.
- Hook modules: `31` `use-*.ts` files under `src/hooks`.
- Data stack: TanStack Query + Zustand auth/session store.
- Runtime hosting: admin SPA served via API worker static catch-all from `ASSETS` (R2-backed binding), `admin.*` hostname maps to `/admin/*` fallback.
- UI language direction: Korean-primary labels/content.

## CORE INTEGRATION FILES

- `src/app/layout.tsx` - shell composition root.
- `src/components/admin-shell.tsx` - auth-gated app frame.
- `src/components/providers.tsx` - QueryClient + bootstrap.
- `src/components/sidebar.tsx` - nav + site switching surface.
- `src/stores/auth.ts` - persisted user/tokens/site context.
- `src/lib/api.ts` - API client with refresh-on-401 retry.

## ROUTE GROUPS (TOP LEVEL)

- `dashboard` (+ `analytics`, `recommendations`).
- `attendance` (+ `sync`, `unmatched`).
- `posts`, `votes` (+ `candidates`, `new`, dynamic detail).
- `actions`, `announcements`, `approvals`, `audit`.
- `education`, `monitoring`, `sync-errors`.
- `points` (+ `policies`, `settlement`).
- `recommendations`, `rewards`, `settings`, `members`, `login`.

## CROSS-CUTTING PATTERNS

- Dynamic route wrappers keep static export compatibility (`generateStaticParams` placeholder + client page import).
- Site-scoped queries hinge on `currentSiteId` from auth store.
- Query invalidation handled in hook mutation layers, not page components.
- Sidebar is always mounted (mobile icon rail + desktop expand state).

## CHILD AGENTS MAP

- `src/app/AGENTS.md` - full app route topology and wrappers.
- `src/app/attendance/AGENTS.md` - logs/unmatched/sync specifics.
- `src/app/posts/AGENTS.md` - review list/detail composition.
- `src/app/votes/AGENTS.md` - period/candidate/result flows.
- `src/app/education/AGENTS.md` - tabbed education hub.
- `src/components/AGENTS.md` - shell/sidebar/provider components.
- `src/hooks/AGENTS.md` - 31-hook inventory + boundaries.
- `src/hooks/__tests__/AGENTS.md` - hook test harness and coverage.
- `src/stores/AGENTS.md` - auth store contract.
- `src/lib/AGENTS.md` - API client and utility boundary.
