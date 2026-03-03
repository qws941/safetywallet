# AGENTS: JOBS

## PURPOSE

Scheduled job definitions and execution logic invoked by `JobScheduler` Durable Object.
Contains the schedule registry plus daily/monthly/sync job implementations.

## FILES/STRUCTURE

- Runtime job files: 5
  - `registry.ts`
  - `daily-jobs.ts`
  - `monthly-jobs.ts`
  - `sync-jobs.ts`
  - `helpers.ts`
- Test files in `__tests__/`: `helpers.test.ts`, `orchestrator.test.ts`, `registry.test.ts`

## CURRENT FACTS

- `registry.ts` defines `JobDefinition` and returns 10 scheduled jobs.
- Jobs currently registered:
  - `fas-sync`
  - `publish-scheduled-announcements`
  - `metrics-alert-check`
  - `fas-full-sync-daily`
  - `overdue-action-check`
  - `pii-lifecycle-cleanup`
  - `vote-reward-distribution`
  - `data-retention`
  - `month-end-snapshot`
  - `auto-nomination`
- `sync-jobs.ts` executes full/incremental FAS sync and clears/sets `KV["fas-status"]` depending on outcome.
- `helpers.ts` logger namespace is `scheduled` and includes ELK sync-failure emission helpers.

## CONVENTIONS

- Keep schedules expressed via `intervalMs` + optional `kstHour/dayOfWeek/dayOfMonth` in registry.
- Keep long-running or conflict-prone jobs protected with sync locks.
- Keep retry behavior explicit via `withRetry` arguments at call sites.
- Keep failure persistence centralized through `persistSyncFailure` for consistent telemetry and admin triage.

## ANTI-PATTERNS

- Do not add ad-hoc scheduler logic outside `registry.ts` + `JobScheduler` contract.
- Do not mutate sync-lock names casually; lock keys gate job mutual exclusion.
- Do not bypass `persistSyncFailure` on FAS sync failure paths.
- Do not duplicate alert firing logic across files when helper functions already encapsulate it.
