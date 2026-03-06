# Posts

## PURPOSE

- Define admin post-review route ownership for list and detail flows.

## FILE INVENTORY

- Route-level files:
  - `page.tsx`, `page.test.tsx`, `error.tsx`
  - `[id]/page.tsx` (static-export wrapper)
  - `[id]/post-detail.tsx`
  - `[id]/post-detail-helpers.ts`
- Detail component pack (`[id]/components/`):
  - `ai-analysis-card.tsx`
  - `assignment-form.tsx`
  - `metadata-card.tsx`
  - `post-classification-card.tsx`
  - `post-content-card.tsx`
  - `review-history-card.tsx`
- Detail tests: `[id]/__tests__/`.

## CONVENTIONS

- List route manages filters/search/sort and navigates row click to `/posts/{id}`.
- `[id]/page.tsx` stays a thin wrapper for static export; detail logic lives in `post-detail.tsx`.
- Detail page composes focused cards (content, metadata, AI/classification, history, assignment).
- Display labels/status/date mappings stay in `post-detail-helpers.ts`.
- Mutation and invalidation behavior remains in hook modules, not detail cards.

## ANTI-PATTERNS

- Re-introducing obsolete helper names (`post-helpers.ts`) or duplicate mapping files.
- Adding data-fetching side effects inside presentational card components.
- Expanding wrapper route logic beyond params handoff and static placeholder generation.
