# AGENTS: PACKAGES/UI

## SCOPE DELTA

- Owns package-level export surface and theme primitives.
- `src/components/AGENTS.md` owns component-file specifics.

## SOURCE INVENTORY

```text
src/
├── index.ts
├── globals.css
├── lib/
│   └── utils.ts
└── components/
    ├── alert-dialog.tsx
    ├── avatar.tsx
    ├── badge.tsx
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── input.tsx
    ├── select.tsx
    ├── sheet.tsx
    ├── skeleton.tsx
    ├── switch.tsx
    ├── toast.tsx
    ├── toaster.tsx
    └── use-toast.tsx
```

## BARREL EXPORTS (CURRENT)

- Utility: `cn`.
- Core controls: `Button`, `buttonVariants`, `Card*`, `Input`, `Badge`, `badgeVariants`, `Skeleton`, `Avatar*`.
- Toast stack: `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`, `useToast`, `toast`, `Toaster`.
- Modal stack: `AlertDialog*`, `Dialog*`, `Sheet*`.
- Select stack: `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.
- Toggle: `Switch`.

## THEME TOKENS (`globals.css`)

- Defines light/dark HSL variables for: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, `ring`, `radius`.
- Base layer applies `border-border` globally and `bg-background text-foreground` to `body`.

## PACKAGE RULES

- Keep `src/index.ts` as canonical public surface.
- Add/remove component export in same change as file add/remove.
- Keep `cn()` in `lib/utils.ts` only (`clsx` + `twMerge` composition).

## ANTI-DRIFT

- No token renames in CSS without consuming-app migration.
- No duplicate helper utilities outside `lib/utils.ts`.
- No undocumented public exports from component files.
