# AGENTS: SCHEDULED

## PURPOSE

Worker CRON orchestrator for sync, maintenance, retention, month-end jobs.
Single runtime entry: `scheduled/index.ts`.

## KEY FILES

| File                      | Role              | Current Facts                                                                              |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `index.ts`                | scheduler runtime | Exports `scheduled(...)` wrapper and internal `runScheduled(...)` dispatch by cron string. |
| `__tests__/index.test.ts` | helper/flow tests | Covers retry helper, KST date helpers, ELK failure telemetry builders, emission behavior.  |

## TRIGGER MATRIX

| Cron                        | Branch in `runScheduled`     | Main Work                                                                                          |
| --------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `*/5 * * * *`               | `trigger.startsWith("*/5 ")` | bootstrap full sync or incremental FAS sync, publish scheduled announcements, metrics alert check. |
| `0 21 * * *`                | explicit equality            | daily full FAS sync, overdue action check, PII lifecycle cleanup.                                  |
| `0 3 * * 0` / `0 3 * * SUN` | weekly branch                | retention cleanup.                                                                                 |
| `0 0 1 * *`                 | monthly branch               | month-end snapshot + auto nomination.                                                              |

## PATTERNS

- Sync failures call `persistSyncFailure(...)`: ELK emit attempt + `syncErrors` insert + optional KV `fas-status=down`.
- Retry policy via `withRetry(fn, attempts, baseDelayMs)` with exponential backoff.
- Independent tasks grouped with `Promise.all` in 5-minute and daily branches.
- `scheduled(...)` uses `ctx.waitUntil(runScheduled(...))` for proper cron lifecycle tracking.

## GOTCHAS/WARNINGS

- Trigger matching is string-based; small cron text changes alter code path.
- FAS down alerting depends on KV + webhook availability; failures are logged, not fatal.
- Bulk mutations should stay chunked (`dbBatchChunked`) to avoid D1 parameter limits.
