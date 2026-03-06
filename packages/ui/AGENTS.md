# UI

Shared component primitives and styling contracts for `@safetywallet/ui`.

## Inventory

- `src/index.ts` — public barrel for all exported primitives/hooks/utilities.
- `src/globals.css` — HSL token layer (`background`, `foreground`, `surface`, `action`, `status`, including `success`/`warning`).
- `src/lib/utils.ts` — `cn()` class-merging helper (`clsx` + `tailwind-merge`).
- `src/components/` — 15 component modules (documented in `src/components/AGENTS.md`).
- `src/__tests__/` — 8 files (7 component/behavior test suites + test setup).

## Export Surface

- Public exports include primitives and compounds: `Button`, `Badge`, `Card*`, `Input`,
  `Skeleton`, `Avatar*`, `AlertDialog*`, `Dialog*`, `Sheet*`, `Select*`, `Toast*`,
  `Toaster`, `Switch`, `ErrorBoundary`, plus `cn`, `useToast`, and `toast`.
- `src/index.ts` is the only supported import surface for apps.

## Conventions

- Component file add/remove requires synchronized barrel update in `src/index.ts`.
- Use `cn()` for all class composition; avoid string concatenation helpers.
- Token rename/removal is a contract migration and must be coordinated with consuming apps.
- Keep package domain-agnostic: no business copy or API calls inside UI primitives.

## Drift Guards

- No undeclared public exports from internal files.
- No duplicate utility functions replacing `src/lib/utils.ts`.
- No app-specific Tailwind tokens in shared `globals.css`.
