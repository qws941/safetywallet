# AGENTS: APP

## PURPOSE

Route-layer guide for `src/app`. Focus: page topology, wrappers, feature boundaries.

## KEY FILES

| File               | Role               | Notes                             |
| ------------------ | ------------------ | --------------------------------- |
| `layout.tsx`       | root layout        | mounts `AdminShell` + `Providers` |
| `page.tsx`         | root redirect      | client redirect to `/dashboard`   |
| `error.tsx`        | app-level error UI | fallback inside route tree        |
| `global-error.tsx` | global error UI    | full-app crash fallback           |
| `not-found.tsx`    | 404 UI             | static fallback                   |
| `globals.css`      | app-wide styles    | baseline utility imports          |

## ROUTE SURFACE

| Segment       | Main files                                                    | Delta notes                         |
| ------------- | ------------------------------------------------------------- | ----------------------------------- |
| `attendance/` | `page.tsx`, `sync/page.tsx`, `unmatched/page.tsx`             | tabs + sync tools + unmatched table |
| `posts/`      | `page.tsx`, `[id]/page.tsx`, `[id]/post-detail.tsx`           | list page + dynamic wrapper         |
| `votes/`      | `page.tsx`, `new/page.tsx`, `candidates/page.tsx`, `[id]/...` | month-based admin workflows         |
| `education/`  | `page.tsx`, `components/*`                                    | single tabbed hub page              |
| `members/`    | `page.tsx`, `[id]/page.tsx`                                   | includes dynamic wrapper            |

## PATTERNS

| Pattern                  | Where                                                                                                       | Why                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Dynamic wrapper page     | `posts/[id]/page.tsx`, `votes/[id]/page.tsx`, `votes/[id]/candidates/new/page.tsx`, `members/[id]/page.tsx` | static export compatible placeholder params |
| Feature-local components | `attendance/components`, `votes/components`, `education/components`                                         | keep page files orchestration-only          |
| Feature-local helpers    | `attendance-helpers.ts`, `votes-helpers.ts`, `education-helpers.ts`                                         | date labels, tab metadata, derivations      |

## GOTCHAS

- Historical docs mentioning `(dashboard)/` route group are stale; current tree is flat under `src/app`.
- `approvals/` exists and has `page.tsx`; no longer empty.
- `attendance/page.tsx` already includes unmatched tab; `attendance/unmatched/page.tsx` remains direct deep-link view.

## CHILD DOCS

| Child                  | Covers                                          |
| ---------------------- | ----------------------------------------------- |
| `attendance/AGENTS.md` | attendance tabs, sync cards, anomaly filters    |
| `posts/AGENTS.md`      | review list/detail boundary and wrappers        |
| `votes/AGENTS.md`      | period/candidate/result cards and dynamic pages |
| `education/AGENTS.md`  | 4-tab education hub implementation              |
