# Attendance

## PURPOSE

- Own attendance admin workflows: logs, unmatched records, and sync diagnostics.

## FILE INVENTORY

- Route files:
  - `page.tsx`, `page.test.tsx`, `error.tsx`
  - `unmatched/page.tsx`
  - `sync/page.tsx`
- Helpers:
  - `attendance-helpers.ts`, `attendance-helpers.test.ts`
  - `sync/sync-helpers.ts`
- Components:
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

## ANTI-PATTERNS

- Splitting unmatched behavior across tabs/routes with divergent filter logic.
- Duplicating sync normalization logic outside `sync/sync-helpers.ts`.
- Pulling large API data transforms into JSX components.
