# Components

## PURPOSE

- File-level catalog for shared UI component modules.
- Tracks module ownership under `@safetywallet/ui` component surface.

## INVENTORY

- `AGENTS.md` — local component catalog rules.
- `alert-dialog.tsx` — Radix alert dialog wrappers.
- `avatar.tsx` — avatar primitive triplet.
- `badge.tsx` — badge variants via CVA.
- `button.tsx` — button variants and sizes.
- `card.tsx` — card layout primitive set.
- `dialog.tsx` — modal dialog compound wrappers.
- `error-boundary.tsx` — class error boundary fallback.
- `input.tsx` — text input primitive.
- `select.tsx` — Radix select compound wrappers.
- `sheet.tsx` — side panel wrappers + variants.
- `skeleton.tsx` — loading placeholder primitive.
- `switch.tsx` — Radix switch wrapper.
- `toast.tsx` — toast primitives, viewport, style variants.
- `toaster.tsx` — toast host renderer.
- `use-toast.tsx` — toast state/reducer hook and dispatcher.

## CONVENTIONS

- Keep component file names kebab-case aligned to exported symbol family.
- Use `cn()` for all class composition.
- Keep Radix wrappers thin; no business branching.
- Keep CVA variant names stable to avoid caller churn.
- Keep `TOAST_LIMIT` and `TOAST_REMOVE_DELAY` as explicit behavior contracts.

## ANTI-PATTERNS

- Cross-module side effects between unrelated component files.
- App-specific state/store dependencies inside shared components.
- Hidden exports not wired through package barrel.
- Breaking prop shape changes without synchronized caller updates.

## DRIFT GUARDS

- Confirm directory remains 16 files (15 TS/TSX + `AGENTS.md`).
- Confirm every module has matching export mapping in `packages/ui/src/index.ts`.
- Confirm variant-bearing modules still use CVA where established.
- Confirm no module introduces package-external runtime coupling.
