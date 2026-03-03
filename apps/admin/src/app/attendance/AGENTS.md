# AGENTS: ATTENDANCE

## SCOPE

- Attendance admin pages and local components.
- Includes logs, unmatched record review, FAS sync diagnostics.

## FILE MAP

- `page.tsx` - primary attendance page; logs/unmatched tab orchestration.
- `components/attendance-logs-tab.tsx` - logs table + filter surface.
- `components/unmatched-tab.tsx` - unresolved attendance records table.
- `components/attendance-stats.tsx` - summary counters/cards.
- `attendance-helpers.ts` - KST/date/status helper utilities.
- `sync/page.tsx` - sync dashboard route.
- `sync/components/*` - sync status, manual trigger, search, error/log widgets.
- `sync/sync-helpers.ts` - sync health/format normalization helpers.
- `unmatched/page.tsx` - direct deep-link unmatched view.
- `error.tsx` - feature-scoped error fallback.

## OPERATION FLOW

- Logs tab: query + filter + anomaly review for attendance events.
- Unmatched tab: detect records lacking worker/site linkage.
- Sync page: inspect health, run manual sync, review recent sync errors.

## FILTER/DERIVATION PATTERNS

- In-page tab switching for logs/unmatched avoids full route transition.
- Derived anomaly flags applied on log rows (timing irregularities, duplicate-name suspicion).
- Sync health normalization treats multiple backend variants as healthy (`up`, `ok`, `healthy`, empty-like states).
- Helper utilities centralize display labels and timezone/date shaping.

## KNOWN CONSTRAINTS

- `useAttendanceLogs` uses high limit (`2000`) by design for admin-side filtering.
- `attendance/unmatched/page.tsx` and unmatched tab in `attendance/page.tsx` must stay behavior-aligned.
- Date partitioning logic assumes KST operational context.

## TEST SURFACE

- `page.test.tsx` and `attendance-helpers.test.ts` cover route + helper behavior.
- Sync components contain separate local tests under `sync/components` where present.

## BOUNDARY NOTES

- API behavior lives in `src/hooks/use-attendance.ts` and `src/hooks/use-fas-sync.ts`.
- This doc stays UI-route focused; do not duplicate hook/store contracts here.
