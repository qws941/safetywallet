# Components

## PURPOSE

- Document shared admin component boundaries under `src/components`.

## FILE INVENTORY

- Root components:
  - `admin-shell.tsx`
  - `sidebar.tsx`
  - `providers.tsx`
  - `data-table.tsx`
  - `image-lightbox.tsx`
  - `rich-text-editor.tsx`
  - `stats-card.tsx`
- Feature component folders:
  - `approvals/` (dialog/list/history/reject set)
  - `review-actions/` (7 review action modules)
  - `votes/` (`candidate-dialog.tsx`)
  - `ui/` (`table.tsx`)
- Test folder:
  - `__tests__/` with `14` component test files.

## CONVENTIONS

- `admin-shell.tsx` owns auth gate + app frame composition.
- `providers.tsx` is the single app-level provider mount (QueryClient/bootstrap/toast).
- `sidebar.tsx` owns nav + site switching UI and stays mounted in mobile/desktop layouts.
- Route pages should compose from this folder instead of embedding large repeated JSX blocks.
- Generic visual primitives should be reused from `@safetywallet/ui` unless admin-only behavior is required.

## ANTI-PATTERNS

- Referencing deleted root modules (for example `review-actions.tsx`, no longer present).
- Adding hook-level business logic directly inside reusable components.
- Reintroducing old mobile drawer patterns that conflict with current always-mounted sidebar model.
