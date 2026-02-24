# AGENTS: ADMIN-APP

## PURPOSE

Admin dashboard subtree guide. Scope: `src/app`, `src/components`, `src/hooks`, `src/stores`.

## KEY FILES

| Area            | Path                             | Why it matters                       |
| --------------- | -------------------------------- | ------------------------------------ |
| Route shell     | `src/app/layout.tsx`             | wraps Providers + AdminShell         |
| Route redirect  | `src/app/page.tsx`               | root redirect to `/dashboard`        |
| Auth gate shell | `src/components/admin-shell.tsx` | login redirect + protected rendering |
| Sidebar/nav     | `src/components/sidebar.tsx`     | desktop collapse + mobile icon strip |
| Query/bootstrap | `src/components/providers.tsx`   | QueryClient + current site bootstrap |
| Auth store      | `src/stores/auth.ts`             | persisted session + role/admin state |

## PATTERNS

| Pattern                          | Applied in                                   | Notes                                                   |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Wrapper pages for dynamic routes | `posts/[id]/page.tsx`, `votes/[id]/page.tsx` | `generateStaticParams` placeholder + client page import |
| Site-scoped admin flows          | hooks + sidebar + Providers                  | `currentSiteId` seeded from memberships                 |
| Domain docs split                | each subtree `AGENTS.md`                     | children document deltas only                           |

## GOTCHAS

- Sidebar architecture changed: no mobile drawer component.
- `Sidebar` always mounted; mobile width fixed `w-16`, desktop expands with `md:w-64`.
- `MobileHeader` only label bar; menu toggle removed from shell.
- `use-votes.ts`, `use-recommendations.ts`, `use-stats.ts`, `use-trends.ts` exist but are not re-exported by `use-api.ts`.

## CHILD MAP

| Child doc                       | Scope delta                                              |
| ------------------------------- | -------------------------------------------------------- |
| `src/app/AGENTS.md`             | route directories, static-export wrappers, feature edges |
| `src/app/attendance/AGENTS.md`  | attendance logs/unmatched/sync modules                   |
| `src/app/posts/AGENTS.md`       | post list + post detail client wrapper                   |
| `src/app/votes/AGENTS.md`       | vote month dashboard + candidate and detail flows        |
| `src/app/education/AGENTS.md`   | tabbed education hub modules                             |
| `src/components/AGENTS.md`      | shell/sidebar/provider/component boundaries              |
| `src/hooks/AGENTS.md`           | hook inventory and barrel boundary                       |
| `src/hooks/__tests__/AGENTS.md` | hook test harness + mock boundaries                      |
| `src/stores/AGENTS.md`          | auth store state/method contracts                        |
