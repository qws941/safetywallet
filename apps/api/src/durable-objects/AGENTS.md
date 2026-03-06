# AGENTS: DURABLE OBJECTS

## PURPOSE

Durable Object runtime classes for rate limiting and scheduler orchestration.
Owns DO action protocols, persistent state keys, and alarm-driven loops.

## INVENTORY

- `RateLimiter.ts` - action protocol for generic + OTP limit/failure state.
- `JobScheduler.ts` - action protocol for job status/list/trigger/enable/disable.
- `__tests__/RateLimiter.test.ts` - limiter behavior coverage.

## CONVENTIONS

- Keep action names explicit and backward-compatible for caller modules.
- Keep storage key prefixes stable (`otp:*` and limiter namespaces).
- Keep alarm lifecycle deterministic and idempotent.
- Keep payload validation strict before state mutation.

## ANTI-PATTERNS

- Do not rename or remove DO actions without synchronized caller updates.
- Do not silently accept malformed payloads.
- Do not move business-domain orchestration into DO classes.
- Do not claim unimplemented test coverage for `JobScheduler`.

## DRIFT GUARDS

- Check `RateLimiter.ts` action union includes `checkLimit`, `recordFailure`, `resetFailures`, `checkOtpLimit`, `resetOtpLimit`.
- Check OTP policy constants remain documented (hourly 5, daily 10, lock 15m).
- Check `JobScheduler.ts` action surface still matches admin/job callers.
- Check DO file count and `__tests__` contents before inventory edits.
