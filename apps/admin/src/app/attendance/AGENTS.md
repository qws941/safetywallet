# AGENTS: ATTENDANCE

## PURPOSE

Attendance admin module. Scope: logs, unmatched records, FAS sync diagnostics.

## KEY FILES

| File                                 | Role                   | Notes                                             |
| ------------------------------------ | ---------------------- | ------------------------------------------------- |
| `page.tsx`                           | primary page           | tab switch (`logs`/`unmatched`) + anomaly filters |
| `components/attendance-logs-tab.tsx` | logs UI                | date/result/company/anomaly filters               |
| `components/unmatched-tab.tsx`       | unmatched UI           | record reconciliation view                        |
| `components/attendance-stats.tsx`    | summary cards          | totals, success/fail, anomaly count               |
| `attendance-helpers.ts`              | helper layer           | KST hour + date formatting                        |
| `sync/page.tsx`                      | sync dashboard         | health normalization + card composition           |
| `sync/components/*`                  | sync widgets           | manual sync, search, errors, logs                 |
| `sync/sync-helpers.ts`               | sync formatter helpers | status/date formatting                            |
| `unmatched/page.tsx`                 | deep-link page         | stand-alone unmatched table route                 |
| `error.tsx`                          | feature error UI       | attendance-only fallback                          |

## PATTERNS

| Pattern                   | Applied in      | Notes                                         |
| ------------------------- | --------------- | --------------------------------------------- |
| In-page tab orchestration | `page.tsx`      | avoids route jump for log/unmatched switching |
| Derived anomaly logic     | `page.tsx`      | flags early/late check-in + duplicate names   |
| Sync health normalization | `sync/page.tsx` | accepts `up/ok/healthy/0/empty` as healthy    |

## GOTCHAS

- `useAttendanceLogs` currently called with `limit=2000`; heavy payload is intentional for admin filtering.
- `attendance/unmatched/page.tsx` and unmatched tab overlap; both must remain aligned.
- Date logic assumes 5AM KST day boundary via helper utilities.

## PARENT DELTA

- Parent app doc covers route tree only.
- This file adds attendance-specific component/helper contracts and sync-card map.
