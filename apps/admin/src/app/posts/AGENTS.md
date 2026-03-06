# Posts

## PURPOSE

- Define admin post-review route ownership for list and detail flows.

## INVENTORY

- Root files (`4` files, `3` TS/TSX):
  - `page.tsx`
  - `page.test.tsx`
  - `error.tsx`
  - `AGENTS.md`
- Subdirs (`1`):
  - `[id]/`
- Detail route files:
  - `[id]/page.tsx`
  - `[id]/post-detail.tsx`
  - `[id]/post-detail-helpers.ts`
- Detail component files:
  - `[id]/components/ai-analysis-card.tsx`
  - `[id]/components/assignment-form.tsx`
  - `[id]/components/metadata-card.tsx`
  - `[id]/components/post-classification-card.tsx`
  - `[id]/components/post-content-card.tsx`
  - `[id]/components/review-history-card.tsx`
- Detail tests:
  - `[id]/__tests__/page.test.tsx`
- Main route files:
  - `page.tsx`, `page.test.tsx`, `error.tsx`

## CONVENTIONS

- List route manages filters/search/sort and navigates row click to `/posts/{id}`.
- `[id]/page.tsx` stays a thin wrapper for static export; detail logic lives in `post-detail.tsx`.
- Detail page composes focused cards (content, metadata, AI/classification, history, assignment).
- Display labels/status/date mappings stay in `post-detail-helpers.ts`.
- Mutation and invalidation behavior remains in hook modules, not detail cards.
- Keep detail component props serializable and route-local.

## ANTI-PATTERNS

- Re-introducing obsolete helper names (`post-helpers.ts`) or duplicate mapping files.
- Adding data-fetching side effects inside presentational card components.
- Expanding wrapper route logic beyond params handoff and static placeholder generation.
- Spreading post-detail helpers into shared global utility folders.

## DRIFT GUARDS

- On adding new detail cards, update `[id]/components/` inventory list.
- On route file changes, keep root and `[id]` inventories in sync.
- Keep root count accurate (`4` files, `1` subdir).
- Ensure wrapper route remains thin after refactors.
