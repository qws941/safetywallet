# AGENTS: MIDDLEWARE

## PURPOSE

Cross-route request guard and observability layer.
Owns authentication context, authorization helpers, attendance gate, throttling adapter, and request telemetry/security headers.

## FILE INVENTORY

| Type                       | Count | Files                                                                                                                                                                                                                                                       |
| -------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime middleware modules | 7     | `analytics.ts`, `attendance.ts`, `auth.ts`, `permission.ts`, `rate-limit.ts`, `request-logger.ts`, `security-headers.ts`                                                                                                                                    |
| Test suites                | 8     | `__tests__/analytics.test.ts`, `__tests__/attendance.test.ts`, `__tests__/auth.test.ts`, `__tests__/cors.test.ts`, `__tests__/permission.test.ts`, `__tests__/rate-limit.test.ts`, `__tests__/request-logger.test.ts`, `__tests__/security-headers.test.ts` |

## CURRENT FACTS

- `auth.ts` validates bearer JWT, checks same-day login freshness, hydrates auth context, and uses KV session cache with DB fallback.
- `attendance.ts` conditionally bypasses for admin users or FAS outage flags and enforces attendance/manual-approval checks.
- `permission.ts` provides role/permission guard helpers (`requireRole`, `requireSiteAdmin`, `requirePermission`).
- `rate-limit.ts` delegates to `RATE_LIMITER` Durable Object action `checkLimit`.
- CORS behavior is validated in middleware tests but configured in `src/index.ts`.

## CONVENTIONS

- Apply `authMiddleware` before permission or attendance guards on protected routes.
- Keep auth failures explicit and consistent (401/403 semantics by guard purpose).
- Keep limiter key prefixes stable to preserve historical buckets.
- Keep middleware functions focused on guard/telemetry concerns, not business mutations.

## ANTI-PATTERNS

- Do not move dynamic CORS composition into this directory.
- Do not bypass rate-limit failures with permissive fallthrough.
- Do not mutate auth context shape without updating all consumers/tests.
- Do not add non-middleware business workflows here.
