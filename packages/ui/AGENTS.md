# UI

## PURPOSE

- Shared UI primitives package consumed by admin and worker apps.
- Stable export barrel for shadcn/Radix wrappers plus style tokens.

## INVENTORY

- `src/index.ts` — sole public export surface for components/hooks/utils.
- `src/components/` — 16 files total: `AGENTS.md` + 15 TS/TSX component modules.
- `src/globals.css` — Tailwind v4 token layer used by shared primitives.
- `src/lib/utils.ts` — `cn()` utility (`clsx` + `tailwind-merge`).
- `src/__tests__/` — 8 files: setup + component behavior suites.
- `package.json` — package scripts/deps/exports.
- `tsconfig.json` — package compiler settings.
- `vitest.config.ts` — package test runner config.

## CONVENTIONS

- Export changes happen through `src/index.ts` only.
- Keep component modules domain-agnostic; UI behavior only.
- Compose classes via `cn()`; no duplicate merge helpers.
- Keep token names in `globals.css` stable across package updates.
- Mirror added/removed component modules in barrel exports immediately.

## ANTI-PATTERNS

- Deep imports from `src/components/*` in consuming apps.
- Business copy, API calls, or app store coupling inside shared primitives.
- Duplicate utility functions replacing `src/lib/utils.ts`.
- Token removals without synchronized consumer updates.

## DRIFT GUARDS

- Confirm `src/components` count remains accurate in this file.
- Confirm `src/index.ts` export list matches actual component modules.
- Confirm test setup still covers changed primitives.
- Confirm parent-child split: file-level details stay in `src/components/AGENTS.md`.
