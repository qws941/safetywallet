# Points

## PURPOSE

- Admin points route contract for manual awards, policy management, and month-end settlement flows.
- Keeps ledger, policy, and settlement responsibilities separated by subroute.

## INVENTORY

- Root files (3): `page.tsx`, `error.tsx`, `AGENTS.md`.
- Subdirs (2): `policies/`, `settlement/`.
- `policies/` files (5 + nested test dir): `page.tsx`, `policy-helpers.ts`, 3 component files, `components/__tests__/`.
- `settlement/` files (2 + nested test dir): `page.tsx`, `__tests__/page.test.tsx`.

## CONVENTIONS

- Keep `page.tsx` focused on manual award flow and ledger visibility.
- Keep policy CRUD inside `policies/`, with display helpers staying in `policy-helpers.ts`.
- Keep settlement snapshot/finalize UX inside `settlement/` only.
- Keep mutations and invalidation behavior in hooks, not route-local tables/dialogs.

## ANTI-PATTERNS

- Mixing settlement-only logic back into the root ledger page.
- Duplicating policy label or dialog logic outside `policies/`.
- Hiding destructive settlement or policy actions behind undocumented helper indirection.
- Putting API transport state inside `DataTable` or dialog presentational components.

## DRIFT GUARDS

- Recount `policies/` and `settlement/` subtree files before updating inventory counts.
- Keep policy helper ownership explicit when adding new mapping/label files.
- Keep settlement tests aligned with snapshot/finalize behavior.
- Update parent `src/app/AGENTS.md` child-doc list if this file moves or is removed.
