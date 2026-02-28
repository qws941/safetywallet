# AGENTS: DURABLE-OBJECTS

## PURPOSE

Stateful coordination runtime for rate limiting.
Current scope: single Durable Object class `RateLimiter`.

## KEY FILES

| File                            | Role                               | Current Facts                                                                                       |
| ------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `RateLimiter.ts`                | DO request handler + state machine | Supports actions: `checkLimit`, `recordFailure`, `resetFailures`, `checkOtpLimit`, `resetOtpLimit`. |
| `__tests__/RateLimiter.test.ts` | behavior verification              | Covers generic limiter windows plus OTP hourly/daily limit behavior.                                |

## RUNTIME SNAPSHOT

- Generic limiter state: `{ count, resetAt }` keyed by caller key.
- Failure lock state: `{ failures, lockedUntil }` for OTP login lock window.
- OTP limiter state: hourly + daily counters with separate reset timestamps.
- Cleanup alarm runs every 7 days; prunes stale storage entries.

## PATTERNS

- Action dispatch in `fetch()` uses strict POST JSON payload with discriminated `action`.
- Response payloads stay minimal/stable for middleware compatibility.
- OTP limits: hourly 5, daily 10, lock duration 15 minutes.
- Unknown action and invalid payload return 400, not silent no-op.

## GOTCHAS/WARNINGS

- Changing action names requires matching updates in middleware DO client code.
- Storage keys include `otp:{key}` namespace for OTP counters; preserve format.
- `constructor` schedules cleanup alarm on first access via `blockConcurrencyWhile`.
