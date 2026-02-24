# AGENTS: COMPONENTS

## PURPOSE

Admin UI composition layer. Scope: shell/navigation, shared widgets, feature component packs.

## KEY FILES

| File                         | Role                     | Notes                                            |
| ---------------------------- | ------------------------ | ------------------------------------------------ |
| `admin-shell.tsx`            | app shell                | auth gate + login bypass + frame layout          |
| `sidebar.tsx`                | navigation system        | `Sidebar`, `MobileHeader`, internal `SidebarNav` |
| `providers.tsx`              | app providers            | QueryClient + site bootstrap gate + toaster      |
| `data-table.tsx`             | generic table            | search/sort/pagination/selectable rows           |
| `review-actions.tsx`         | post review action panel | approve/reject/request/urgent flows              |
| `stats-card.tsx`             | metric tile              | reusable dashboard summary card                  |
| `approvals/*`                | approvals widgets        | dialog/list/history/reject components            |
| `votes/candidate-dialog.tsx` | vote component           | add-candidate dialog                             |
| `ui/table.tsx`               | local table primitive    | route pages importing non-shared table variant   |

## PATTERNS

| Pattern               | Applied in             | Notes                                                      |
| --------------------- | ---------------------- | ---------------------------------------------------------- |
| Site bootstrap gate   | `providers.tsx`        | blocks protected shell until `currentSiteId` resolved      |
| Sidebar cache hygiene | `sidebar.tsx`          | logout clears query cache; site switch invalidates queries |
| Component test focus  | `__tests__/*.test.tsx` | behavior-focused tests per component                       |

## GOTCHAS

- `MobileSidebar` removed; do not reintroduce drawer/menu state.
- Current exports from `sidebar.tsx`: `Sidebar`, `MobileHeader`; `SidebarNav` is internal helper.
- Sidebar is always visible now: mobile icon strip (`w-16`), desktop expandable (`md:w-64`).
- `admin-shell.tsx` no longer tracks mobile menu open/close state.

## PARENT DELTA

- Parent doc links component area at high level.
- This file defines concrete shell/sidebar/provider contracts and the updated no-drawer nav model.
