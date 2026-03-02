# AGENTS: JOBS

## PURPOSE

Scheduled job definitions and execution logic. Dispatched by `JobScheduler` DO.
Daily retention/compliance, monthly snapshots/rewards, FAS sync runners + shared helpers/telemetry.

## KEY FILES

| File              | LOC | Responsibility                                                                         |
| ----------------- | --- | -------------------------------------------------------------------------------------- |
| `registry.ts`     | 209 | `JobDefinition` interface, `JOB_REGISTRY` (10 entries), `runScheduledJobs(env)` entry  |
| `daily-jobs.ts`   | 364 | Data retention, overdue action check, PII cleanup, announcement publish, metrics alert |
| `monthly-jobs.ts` | 464 | Month-end points snapshot, auto-nomination, vote reward distribution                   |
| `sync-jobs.ts`    | 287 | FAS full sync + incremental sync via Hyperdrive                                        |
| `helpers.ts`      | 330 | `log`, `withRetry`, `persistSyncFailure`, ELK telemetry utilities                      |

## JOB INVENTORY (10)

### Daily (5)

- `runDataRetention` — prune expired audit/metric records.
- `runOverdueActionCheck` — flag overdue action items.
- `runPiiLifecycleCleanup` — remove PII past retention window.
- `publishScheduledAnnouncements` — activate time-gated announcements.
- `runMetricsAlertCheck` — evaluate API metrics thresholds and fire alerts.

### Monthly (3)

- `runMonthEndSnapshot` — points ledger period snapshot with sync lock.
- `runAutoNomination` — auto-generate vote candidates from eligible members.
- `runVoteRewardDistribution` — distribute points for vote period winners.

### Sync (2)

- `runFasFullSync` — full employee sync from FAS MariaDB via Hyperdrive.
- `runFasSyncIncremental` — delta sync of recently updated FAS employees.

## PATTERNS

- `JobDefinition` struct: `name`, `fn(env)`, `intervalMs`, `kstHour`, `dayOfWeek`, `dayOfMonth`, `retryAttempts`, `retryBaseDelayMs`.
- `withRetry(fn, attempts, baseDelay)` — exponential backoff wrapper for job execution.
- Sync jobs use `acquireSyncLock`/`releaseSyncLock` from `src/lib/sync-lock` for mutual exclusion.
- Monthly jobs use D1 transactions + sync lock for idempotent execution.
- FAS sync connects via `FAS_HYPERDRIVE` binding to external MariaDB.
- `persistSyncFailure` writes telemetry to Elasticsearch (index prefix `safetywallet-logs`).

## GOTCHAS

- `helpers.ts` logger tag is `"scheduled"` (legacy name), not `"jobs"`.
- `monthly-jobs.ts` is 464 LOC — largest file; near modularization threshold.
- FAS sync jobs fail gracefully with `fireAlert`/`buildFasDownAlert` from `src/lib/alerting` when Hyperdrive unavailable.
- `__tests__/` subdirectory contains job-level unit tests.

## PARENT DELTA

- Parent `apps/api/AGENTS.md` references scheduled flow → `JobScheduler` DO → `src/jobs/registry.ts`.
- This file documents job inventory, scheduling model, and per-file ownership.
