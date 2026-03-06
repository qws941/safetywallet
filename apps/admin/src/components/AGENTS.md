# Components

## PURPOSE

- Contract for reusable admin UI under `src/components`.
- Track shared component packs and test coverage locations.

## INVENTORY

- Root files (`8` files, `7` TS/TSX):
  - `admin-shell.tsx`
  - `providers.tsx`
  - `sidebar.tsx`
  - `data-table.tsx`
  - `image-lightbox.tsx`
  - `rich-text-editor.tsx`
  - `stats-card.tsx`
  - `AGENTS.md`
- Feature subdirs (`5`):
  - `approvals/`
  - `review-actions/`
  - `votes/`
  - `ui/`
  - `__tests__/`
- Key feature files:
  - `approvals/approval-dialog.tsx`
  - `approvals/approval-list.tsx`
  - `approvals/approval-history.tsx`
  - `approvals/reject-dialog.tsx`
  - `review-actions/index.tsx`
  - `review-actions/action-buttons.tsx`
  - `review-actions/info-request-form.tsx`
  - `review-actions/reject-form.tsx`
  - `review-actions/urgent-confirm.tsx`
  - `review-actions/points-panel.tsx`
  - `votes/candidate-dialog.tsx`
  - `ui/table.tsx`
- Test inventory:
  - `__tests__/` contains root shared component tests.
  - `approvals/__tests__/` contains approvals-focused tests.

## CONVENTIONS

- `admin-shell.tsx` owns authenticated frame composition.
- `providers.tsx` owns app-level providers/bootstrap wiring only.
- `sidebar.tsx` owns nav + site switch UX; no API fetch side effects.
- Keep cross-route primitives here; keep route-only UI in route subtrees.
- Reuse `@safetywallet/ui` primitives unless admin-specific behavior is required.
- Keep table semantics aligned between `data-table.tsx` and `ui/table.tsx`.

## ANTI-PATTERNS

- Reintroducing deleted root modules (for example legacy single-file review actions).
- Embedding hook/business logic directly into reusable presentational components.
- Duplicating approvals components across `components/` and route folders.
- Mixing route-specific constants into `providers.tsx` or `admin-shell.tsx`.

## DRIFT GUARDS

- On new shared component file, add entry in this inventory.
- On moving approvals/review-actions files, update folder-level lists.
- Ensure test files stay near owning shared component group.
- Ensure root file count remains accurate (`8` files unless tree changes).
