# Attendance

## PURPOSE

- Own attendance admin workflows: logs, unmatched records, and sync diagnostics.

## INVENTORY

- Root files (`6` files, `5` TS/TSX):
  - `page.tsx`
  - `page.test.tsx`
  - `error.tsx`
  - `attendance-helpers.ts`
  - `attendance-helpers.test.ts`
  - `AGENTS.md`
- Subdirs (`3`):
  - `components/`
  - `sync/`
  - `unmatched/`
- Main route files:
  - `page.tsx`, `page.test.tsx`, `error.tsx`
  - `unmatched/page.tsx`
  - `sync/page.tsx`
- Helper files:
  - `attendance-helpers.ts`, `attendance-helpers.test.ts`
  - `sync/sync-helpers.ts`
- Component files:
  - `components/attendance-logs-tab.tsx`
  - `components/unmatched-tab.tsx`
  - `components/attendance-stats.tsx`
  - `sync/components/status-cards.tsx`
  - `sync/components/manual-sync-card.tsx`
  - `sync/components/fas-search-card.tsx`
  - `sync/components/sync-errors-card.tsx`
  - `sync/components/sync-logs-card.tsx`
- Tests in subtree:
  - `sync/__tests__/`
  - `sync/components/__tests__/`
  - `unmatched/__tests__/`

## CONVENTIONS

- `page.tsx` is the main tab shell (logs + unmatched) and keeps state local to route.
- `unmatched/page.tsx` remains as a direct-link route and mirrors unmatched tab behavior.
- Sync route (`sync/page.tsx`) is diagnostics-first: health, manual trigger, errors, logs.
- Date and status formatting goes through helper modules (KST-aware display assumptions).
- Data calls stay in hooks (`use-attendance`, `use-fas-sync`), not component files.
- Keep sync-only transforms in `sync/sync-helpers.ts`.

## ANTI-PATTERNS

- Splitting unmatched behavior across tabs/routes with divergent filter logic.
- Duplicating sync normalization logic outside `sync/sync-helpers.ts`.
- Pulling large API data transforms into JSX components.
- Coupling attendance tabs directly to transport layer objects.

## DRIFT GUARDS

- On any `sync/` card changes, verify `sync/page.tsx` composition list.
- On unmatched flow changes, keep `page.tsx` tab + `unmatched/page.tsx` parity.
- Keep root count accurate (`6` files, `3` subdirs).
- Update helper inventory when adding new formatter/mapper files.
