# AGENTS: VOTES

## SCOPE

- Admin voting module pages and local vote components.
- Covers month/period setup, candidate management, vote results, detail flows.

## FILE MAP

- `page.tsx` - main monthly vote dashboard.
- `components/vote-period-card.tsx` - period open/close controls.
- `components/candidates-card.tsx` - month candidate snapshot.
- `components/results-card.tsx` - aggregated voting results.
- `new/page.tsx` - period creation/start flow.
- `candidates/page.tsx` - candidate CRUD surface.
- `[id]/page.tsx` - dynamic wrapper route for static export.
- `[id]/vote-detail.tsx` - month detail client page.
- `[id]/candidates/new/page.tsx` - nested dynamic wrapper.
- `[id]/candidates/new/add-candidate.tsx` - add-candidate form UI.
- `votes-helpers.ts` - month/status/UI helper derivations.
- `error.tsx` - votes-scoped error fallback.

## DOMAIN MODEL

- Primary context key: vote month (`YYYY-MM`).
- Month key drives period status, candidate set, and result queries.
- Detail route path parameter (`[id]`) represents month/period identifier.

## UI PATTERNS

- Dashboard card composition: period + candidates + results.
- Candidate CRUD in dialog/confirmation flows (`AlertDialog` for destructive action).
- New-period flow writes period, then routes into month detail workflow.
- Dynamic pages use wrapper/client split for static-export compatibility.

## CONSTRAINTS

- Do not reintroduce obsolete `periods/page.tsx` or `results/page.tsx` routes; current design keeps both as cards on `votes/page.tsx`.
- Keep wrapper routes thin (`generateStaticParams` placeholder + client handoff).
- `use-votes.ts` is intentionally direct-imported (not re-exported by `use-api.ts`).
- CSV download helper in hook uses direct `fetch` by design.

## TEST SURFACE

- `votes/__tests__/*` contains module-level tests for helpers/components.
- Hook behavior validated in `src/hooks/__tests__/use-votes.test.ts`.

## BOUNDARY NOTES

- This file documents route/component behavior only.
- API contract and query invalidation live in `src/hooks/use-votes.ts`.
