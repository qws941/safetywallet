# AGENTS: POSTS

## PURPOSE

Safety report review module. Scope: list filters, detail review, assignment/history cards.

## KEY FILES

| File                                      | Role                   | Notes                                                |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------- |
| `page.tsx`                                | list page              | category/risk/status/urgent/date filters + DataTable |
| `[id]/page.tsx`                           | static-export wrapper  | placeholder param + `post-detail` client page        |
| `[id]/post-detail.tsx`                    | detail orchestrator    | fetches post, wires cards/actions                    |
| `[id]/post-detail-helpers.ts`             | formatter helpers      | labels/date/status display                           |
| `[id]/components/post-content-card.tsx`   | evidence/content block | core report content rendering                        |
| `[id]/components/metadata-card.tsx`       | metadata block         | author/site/timestamps/status                        |
| `[id]/components/review-history-card.tsx` | history block          | review timeline/audit detail                         |
| `[id]/components/assignment-form.tsx`     | assignee workflow      | action assignment and notes                          |
| `error.tsx`                               | feature error UI       | posts-only fallback                                  |

## PATTERNS

| Pattern                        | Applied in      | Notes                                        |
| ------------------------------ | --------------- | -------------------------------------------- |
| Rich filter state object       | `page.tsx`      | single `PostFilters` state, clear reset path |
| Enum-to-label maps             | `page.tsx`      | Korean labels for review/action/category     |
| Row click navigation           | `page.tsx`      | table row opens `/posts/{id}`                |
| Detail via wrapper indirection | `[id]/page.tsx` | keeps static-export compatibility            |

## GOTCHAS

- Legacy references to `post-helpers.ts` are stale; active helper file is `[id]/post-detail-helpers.ts`.
- Detail route uses wrapper+client split; edits to `[id]/page.tsx` must preserve placeholder params.
- `ReviewActions` state transitions rely on server mutation success callbacks.

## PARENT DELTA

- Parent app doc lists the route surface.
- This file documents posts-local filters, card composition, and wrapper constraints.
