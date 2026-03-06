# AGENTS: JOBS

## PURPOSE

Scheduled job implementations and registry consumed by the `JobScheduler` Durable Object.
This directory owns cron-like policy, retries, and scheduler-oriented helper utilities.

## FILE INVENTORY

| Type            | Count | Files                                                                                       |
| --------------- | ----- | ------------------------------------------------------------------------------------------- |
| Runtime modules | 5     | `registry.ts`, `daily-jobs.ts`, `monthly-jobs.ts`, `sync-jobs.ts`, `helpers.ts`             |
| Test suites     | 3     | `__tests__/helpers.test.ts`, `__tests__/orchestrator.test.ts`, `__tests__/registry.test.ts` |

## CURRENT FACTS

- `registry.ts` defines `JobDefinition` and currently registers 10 jobs.
- Registered jobs: `fas-sync`, `publish-scheduled-announcements`, `metrics-alert-check`, `fas-full-sync-daily`, `overdue-action-check`, `pii-lifecycle-cleanup`, `vote-reward-distribution`, `data-retention`, `month-end-snapshot`, `auto-nomination`.
- `sync-jobs.ts` runs full/incremental FAS sync and updates `KV["fas-status"]` based on sync health.
- `helpers.ts` owns scheduler logging namespace and sync-failure persistence helpers.

## CONVENTIONS

- Keep schedule metadata centralized in `registry.ts` (`intervalMs`, `kstHour`, `dayOfWeek`, `dayOfMonth`).
- Keep lock-scoped critical jobs protected by sync-lock helpers.
- Keep retry semantics explicit at call sites (attempt count/base delay).
- Keep failure persistence and alert trigger paths consistent through shared helper APIs.

## ANTI-PATTERNS

- Do not add scheduler dispatch logic outside registry + `JobScheduler` contract.
- Do not change lock key names casually in sync-critical jobs.
- Do not bypass failure persistence for FAS-related job errors.
- Do not duplicate alert/failure side effects when shared helpers exist.
