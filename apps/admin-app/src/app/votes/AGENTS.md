# AGENTS: VOTES

## PURPOSE

Voting admin module. Scope: monthly vote period, candidates, results, detail routes.

## KEY FILES

| File                                    | Role                    | Notes                                          |
| --------------------------------------- | ----------------------- | ---------------------------------------------- |
| `page.tsx`                              | main dashboard          | month picker + period/candidates/results cards |
| `components/vote-period-card.tsx`       | period block            | start/end window control                       |
| `components/candidates-card.tsx`        | candidate summary block | month-scoped candidate list                    |
| `components/results-card.tsx`           | results block           | month-scoped aggregated output                 |
| `new/page.tsx`                          | create flow             | month input then redirect to `/votes/{month}`  |
| `candidates/page.tsx`                   | candidate management    | table + create dialog + delete confirmation    |
| `[id]/page.tsx`                         | detail wrapper          | static-export placeholder + `vote-detail`      |
| `[id]/vote-detail.tsx`                  | detail client page      | period-centric detail controls                 |
| `[id]/candidates/new/page.tsx`          | nested wrapper          | forwards to `add-candidate` client page        |
| `[id]/candidates/new/add-candidate.tsx` | add-candidate form      | explicit per-period candidate addition         |
| `votes-helpers.ts`                      | labels/helpers          | vote-related UI derivations                    |
| `error.tsx`                             | feature error UI        | votes-only fallback                            |

## PATTERNS

| Pattern                      | Applied in            | Notes                                       |
| ---------------------------- | --------------------- | ------------------------------------------- |
| Month as primary context     | all pages             | `YYYY-MM` state drives queries/mutations    |
| Wrapper + client split       | dynamic routes        | required for static export of `[id]` routes |
| Dialog-driven candidate CRUD | `candidates/page.tsx` | create via dialog, delete via AlertDialog   |

## GOTCHAS

- Legacy references to `periods/page.tsx` or `results/page.tsx` are stale; those are component blocks on `page.tsx`.
- `use-votes.ts` is not in barrel export; imports must target `@/hooks/use-votes`.
- CSV export helper in `use-votes.ts` performs direct `fetch` for file download; this is intentional edge behavior.

## PARENT DELTA

- Parent app doc covers route existence.
- This file captures votes-local month context model and dynamic wrapper constraints.
