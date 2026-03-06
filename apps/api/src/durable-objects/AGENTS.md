# AGENTS: DURABLE OBJECTS

## PURPOSE

Stateful Worker components for throttling and scheduled job orchestration.
This directory is limited to Durable Object runtime classes and direct tests.

## FILE INVENTORY

| Type                   | Count | Files                               |
| ---------------------- | ----- | ----------------------------------- |
| Durable Object classes | 2     | `RateLimiter.ts`, `JobScheduler.ts` |
| Tests                  | 1     | `__tests__/RateLimiter.test.ts`     |

## CURRENT FACTS

- `RateLimiter` handles actions `checkLimit`, `recordFailure`, `resetFailures`, `checkOtpLimit`, `resetOtpLimit`.
- OTP policy in `RateLimiter`: hourly 5, daily 10, lock window 15 minutes.
- `RateLimiter` uses persistent storage key prefixes (`otp:*` and limiter keys) with periodic cleanup alarms.
- `JobScheduler` handles `status`, `list`, `trigger`, `enable`, `disable` and dispatches from `src/jobs/registry.ts` on a 60-second tick.

## CONVENTIONS

- Keep action parsing strict; unknown actions must return explicit client errors.
- Keep response shape stable because middleware/admin callers parse DO responses.
- Keep storage key namespaces stable to avoid orphaned state.
- Keep alarm bootstrap logic deterministic in constructor lifecycle.

## ANTI-PATTERNS

- Do not rename action names without synchronized caller changes.
- Do not swallow malformed payload failures.
- Do not add domain business orchestration directly in DO classes.
- Do not claim `JobScheduler` unit-test coverage here unless a test file is added.
