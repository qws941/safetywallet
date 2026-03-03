# AGENTS: PACKAGES/UI

## SCOPE DELTA

- Owns package export surface + theme primitives only.
- Component-level file details live in `src/components/AGENTS.md`.

## INVENTORY (CURRENT)

```text
src/
├── index.ts
├── globals.css
├── lib/utils.ts
├── components/ (14 files)
└── __tests__/ (8 files)
```

## COMPONENT SET (14)

- `alert-dialog`, `avatar`, `badge`, `button`, `card`, `dialog`, `input`.
- `select`, `sheet`, `skeleton`, `switch`, `toast`, `toaster`, `use-toast`.

## PUBLIC BARREL (`src/index.ts`)

- Utility: `cn`.
- Core: `Button`, `Card*`, `Input`, `Badge`, `Skeleton`, `Avatar*`.
- Overlay stack: `AlertDialog*`, `Dialog*`, `Sheet*`.
- Select stack: `Select*` including scroll buttons.
- Toast stack: `Toast*`, `useToast`, `toast`, `Toaster`.
- Toggle: `Switch`.

## THEME CONTRACT (`globals.css`)

- HSL token system for background/foreground/surface/action/status colors.
- Includes `success` + `warning` custom tokens in addition to shadcn defaults.
- Base layer applies global `border-border` and body background/foreground classes.

## MODULE RULES

- Add/remove component file: update `src/index.ts` same commit.
- Keep helper composition centralized in `lib/utils.ts` (`clsx` + `twMerge`).
- Token rename/removal requires consuming app migration.
- Keep component package free of app-specific business strings.

## ANTI-DRIFT

- No undocumented public export.
- No duplicate `cn` helpers.
- No stale component/test counts in this file.
