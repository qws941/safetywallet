# Components

Shared React UI component modules for `@safetywallet/ui`.

## Inventory (15 files)

- `alert-dialog.tsx` — `AlertDialog*` wrappers over Radix dialog primitives.
- `avatar.tsx` — `Avatar`, `AvatarImage`, `AvatarFallback`.
- `badge.tsx` — badge variants via CVA.
- `button.tsx` — button variants and size/intent contract.
- `card.tsx` — card layout primitives (`Card*`).
- `dialog.tsx` — modal dialog compound components.
- `error-boundary.tsx` — class-based `ErrorBoundary` fallback boundary.
- `input.tsx` — text input primitive.
- `select.tsx` — Radix select with trigger/content/item wrappers.
- `sheet.tsx` — side-sheet/drawer wrappers with variant support.
- `skeleton.tsx` — loading placeholder primitive.
- `switch.tsx` — toggle switch primitive.
- `toast.tsx` — toast primitives, viewport, and style variants.
- `toaster.tsx` — singleton toast host renderer.
- `use-toast.tsx` — state/reducer hook and `toast` dispatch helper.

## Implementation Patterns

- Radix wrapper modules: `alert-dialog`, `dialog`, `select`, `sheet`, `switch`, `toast`.
- CVA variant modules: `badge`, `button`, `sheet`, `toast`.
- Forward refs for DOM-facing primitives to preserve composability.
- Class composition must route through `cn()`.
- `TOAST_LIMIT` and `TOAST_REMOVE_DELAY` are behavior contracts for toast UX.

## Drift Guards

- Export changes here require synchronized update in `packages/ui/src/index.ts`.
- No business-domain text, API wiring, or app store usage in shared primitives.
- No hidden exports that bypass barrel-level API governance.
