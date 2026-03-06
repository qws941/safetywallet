# Votes

## PURPOSE

- Define month-period voting workflows in the admin route tree.

## INVENTORY

- Root files (`4` files, `3` TS/TSX):
  - `page.tsx`
  - `error.tsx`
  - `votes-helpers.ts`
  - `AGENTS.md`
- Subdirs (`5`):
  - `__tests__/`
  - `[id]/`
  - `candidates/`
  - `components/`
  - `new/`
- Main route files:
  - `page.tsx`, `error.tsx`, `votes-helpers.ts`
  - `new/page.tsx`
  - `candidates/page.tsx`
  - `[id]/page.tsx`, `[id]/vote-detail.tsx`
  - `[id]/candidates/new/page.tsx`, `[id]/candidates/new/add-candidate.tsx`
- Shared vote cards:
  - `vote-period-card.tsx`
  - `candidates-card.tsx`
  - `results-card.tsx`
- Tests in subtree:
  - `__tests__/page.test.tsx`
  - `new/__tests__/`
  - `candidates/__tests__/`
  - `[id]/__tests__/`
  - `[id]/candidates/new/__tests__/`

## CONVENTIONS

- Vote month (`YYYY-MM`) is the primary workflow key.
- `votes/page.tsx` is the dashboard shell and composes period/candidate/result cards.
- New flow (`new/page.tsx`) creates a period and transitions into month detail.
- Dynamic routes (`[id]`, nested candidate-new) keep wrapper/client split for static export.
- Candidate CRUD and period controls use explicit confirmation UX for destructive actions.
- API orchestration and invalidation rules stay in `use-votes.ts`.
- Keep `votes-helpers.ts` for display helpers only.

## ANTI-PATTERNS

- Reintroducing split historical routes like `periods/page.tsx` or `results/page.tsx`.
- Expanding wrapper routes with business logic beyond param handoff.
- Moving CSV download/export behavior out of the vote hook without documenting parity.
- Duplicating candidate form validation logic across `new/` and `[id]/candidates/new/`.

## DRIFT GUARDS

- On adding/removing vote routes, update subtree route inventory bullets.
- Keep root count accurate (`4` files, `5` subdirs).
- On helper changes, verify `votes-helpers.ts` still display-only.
- Keep test subtree references updated when adding new nested flows.
