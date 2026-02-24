# AGENTS: EDUCATION

## PURPOSE

Education admin hub. Scope: tabbed management for content, quizzes, statutory training, TBM.

## KEY FILES

| File                            | Role                         | Notes                               |
| ------------------------------- | ---------------------------- | ----------------------------------- |
| `page.tsx`                      | single hub page              | tab state + tab button strip        |
| `education-helpers.ts`          | tab metadata                 | `tabItems`, `TabId` contract        |
| `components/contents-tab.tsx`   | content/material workflows   | creation/edit/list actions          |
| `components/quizzes-tab.tsx`    | quiz workflows               | quiz/question CRUD surfaces         |
| `components/statutory-tab.tsx`  | statutory training workflows | legal training records              |
| `components/tbm-tab.tsx`        | TBM workflows                | toolbox meeting content/records     |
| `components/education-types.ts` | local UI/domain types        | shared tab component type contracts |

## PATTERNS

| Pattern                       | Applied in             | Notes                                               |
| ----------------------------- | ---------------------- | --------------------------------------------------- |
| Single-route tab architecture | `page.tsx`             | avoids deep route branching for each education mode |
| Strong tab typing             | helpers + page         | `TabId` union keeps tab switch exhaustive           |
| Domain split by tab component | `components/*-tab.tsx` | each tab owns its own query/mutation flow           |

## GOTCHAS

- Older docs mentioning `materials/page.tsx` or `quizzes/[id]/page.tsx` are stale; current module is tab-driven inside one page.
- `use-education-api.ts` is large and multi-domain; keep tab components narrow to avoid broad state coupling.

## PARENT DELTA

- Parent app doc only points to `education/page.tsx`.
- This file adds tab inventory and component ownership boundaries.
