# AGENTS: DURABLE OBJECTS

## PURPOSE

Stateful worker components for rate limiting and scheduled job orchestration.
This directory contains only Durable Object classes and their direct tests.

## FILES/STRUCTURE

- Runtime DO files: 2
  - `RateLimiter.ts`
  - `JobScheduler.ts`
- Tests currently present: `__tests__/RateLimiter.test.ts`

## CURRENT FACTS

- `RateLimiter.ts` supports request actions:
  - `checkLimit`
  - `recordFailure`
  - `resetFailures`
  - `checkOtpLimit`
  - `resetOtpLimit`
- OTP limits in `RateLimiter.ts`: hourly `5`, daily `10`, lock duration `15m`.
- `RateLimiter` persists OTP keys with `otp:{key}` prefix and schedules cleanup alarms every 7 days.
- `JobScheduler.ts` supports actions: `status`, `list`, `trigger`, `enable`, `disable`.
- `JobScheduler` ticks every 60 seconds and dispatches due jobs from `src/jobs/registry.ts`.

## CONVENTIONS

- Keep `fetch()` payload handling strict and reject unknown actions with `400`.
- Keep response payloads stable because middleware/admin callers parse them directly.
- Keep DO storage key format unchanged (`job:*`, `otp:*`, limiter keys) to avoid orphaned state.
- Keep alarm bootstrap in constructors via `blockConcurrencyWhile` so fresh instances self-schedule.

## ANTI-PATTERNS

- Do not rename action strings without coordinated updates in all callers.
- Do not silently swallow invalid JSON/action payloads.
- Do not add cross-domain business logic here; dispatch to `src/jobs`/`src/lib` modules.
- Do not assume a `JobScheduler` unit test exists in this directory today; only `RateLimiter` test file is present.
