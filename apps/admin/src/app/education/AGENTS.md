# Education

## PURPOSE

- Own the single-route education admin hub (`education/page.tsx`).

## INVENTORY

- Root files (`3` files, `2` TS/TSX):
  - `page.tsx`
  - `education-helpers.ts`
  - `AGENTS.md`
- Subdirs (`2`):
  - `__tests__/`
  - `components/`
- Root test:
  - `__tests__/page.test.tsx`
- Component root files:
  - `components/content-completions.tsx`
  - `components/education-types.ts`
- Tab modules (`4`):
  - `components/contents-tab/` (9 files)
  - `components/quizzes-tab/` (9 files)
  - `components/statutory-tab/` (3 files)
  - `components/tbm-tab/` (5 files)
- Tab tests: `components/__tests__/`.

## CONVENTIONS

- One page hosts all education workflows via tab switching.
- `education-helpers.ts` owns tab ids/labels metadata for the shell.
- Each tab folder is domain-scoped and keeps local constants/types/utils with UI.
- Content completions render as a standalone component but stay inside education scope.
- Data lifecycle and API effects stay in hook layer (`use-education-*` modules).
- Keep cross-tab metadata in `education-helpers.ts` only.

## ANTI-PATTERNS

- Splitting tabs into nested routes without static-export strategy changes.
- Cross-tab shared mutable state that bypasses tab-local boundaries.
- Re-introducing obsolete route assumptions from older materials/quiz route trees.
- Duplicating question/content form constants across tab folders.

## DRIFT GUARDS

- On new tab folder, add it to tab module list with file count.
- On moving tab files, update per-tab file counts in this inventory.
- Keep root count accurate (`3` files, `2` subdirs).
- Keep `components/__tests__/` coverage map aligned with existing tabs.
