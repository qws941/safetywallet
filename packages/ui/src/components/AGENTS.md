# AGENTS: UI/COMPONENTS

## SCOPE DELTA

- Documents concrete component file inventory + export patterns.
- Parent package AGENTS owns high-level package policy.

## FILES (14)

- `alert-dialog.tsx` - `AlertDialog*` compound wrappers.
- `avatar.tsx` - `Avatar`, `AvatarImage`, `AvatarFallback`.
- `badge.tsx` - `Badge`, `badgeVariants`.
- `button.tsx` - `Button`, `buttonVariants`.
- `card.tsx` - `Card*` layout primitives.
- `dialog.tsx` - `Dialog*` compound wrappers.
- `input.tsx` - `Input`.
- `select.tsx` - `Select*` with scroll controls.
- `sheet.tsx` - `Sheet*` compound wrappers.
- `skeleton.tsx` - `Skeleton`.
- `switch.tsx` - `Switch`.
- `toast.tsx` - `Toast*` primitives + typed toast props.
- `toaster.tsx` - `Toaster` host renderer.
- `use-toast.tsx` - `useToast`, `toast`, reducer/state helpers.

## PATTERN MAP

- Radix wrapper modules: `alert-dialog`, `dialog`, `select`, `sheet`, `switch`, `toast`.
- Variant/CVA modules: `button`, `badge`, `toast`, `sheet`.
- Stateful client modules: `toast`, `toaster`, `use-toast`, plus portal/dialog wrappers.
- DOM primitives follow `React.forwardRef` conventions.

## MODULE RULES

- Export change in any component requires matching `src/index.ts` update.
- Keep compound naming aligned with upstream Radix primitive names.
- Keep toast queue constants (`TOAST_LIMIT`, `TOAST_REMOVE_DELAY`) deliberate/stable.
- Keep class merge path via `cn()`; no ad-hoc class concatenation helpers.

## ANTI-DRIFT

- No hidden exports from component files.
- No business-domain defaults embedded in UI primitives.
- No stale component count/list in this file.
