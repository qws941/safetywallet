# AGENTS: UI/COMPONENTS

## SCOPE DELTA

- This file documents concrete component file/export inventory.
- Parent `packages/ui/AGENTS.md` covers package-level surface/theme rules.

## FILES + PRIMARY EXPORTS

- `button.tsx`: `Button`, `buttonVariants`, `ButtonProps`.
- `card.tsx`: `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent`.
- `input.tsx`: `Input`, `InputProps`.
- `badge.tsx`: `Badge`, `badgeVariants`, `BadgeProps`.
- `skeleton.tsx`: `Skeleton`.
- `avatar.tsx`: `Avatar`, `AvatarImage`, `AvatarFallback`.
- `toast.tsx`: `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`, `ToastProps`, `ToastActionElement`.
- `use-toast.tsx`: `useToast`, `toast`, `reducer` (exported for tests).
- `toaster.tsx`: `Toaster`.
- `alert-dialog.tsx`: `AlertDialog*` compound exports.
- `dialog.tsx`: `Dialog*` compound exports.
- `select.tsx`: `Select*` compound exports incl. scroll buttons.
- `switch.tsx`: `Switch`.
- `sheet.tsx`: `Sheet*` compound exports.

## PATTERN MAP

- Radix wrappers: `alert-dialog`, `dialog`, `select`, `switch`, `sheet`, `toast`.
- CVA variants present in: `button`, `badge`, `toast`, `sheet`.
- `"use client"` required in stateful/portal modules: `toast`, `use-toast`, `toaster`, `alert-dialog`, `dialog`, `sheet`.
- `React.forwardRef` is standard for DOM-facing primitives.

## MAINTENANCE RULES

- If a component adds/removes exports, mirror change in `src/index.ts` same commit.
- Keep compound component naming consistent with Radix primitive names.
- Keep `use-toast.tsx` constants stable unless queue semantics intentionally change (`TOAST_LIMIT`, `TOAST_REMOVE_DELAY`).

## ANTI-DRIFT

- Do not export internal helper types/actions unless used by tests or barrel.
- Do not mix business defaults into variant maps.
- Do not bypass `cn()` merge path for class composition.
