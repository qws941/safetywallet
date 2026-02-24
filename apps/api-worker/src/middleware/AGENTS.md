# AGENTS: MIDDLEWARE

## PURPOSE

Request guard layer shared by route modules.
Owns auth context hydration, permission checks, attendance gates, throttling, metrics.

## KEY FILES

| File            | Primary Role             | Current Facts                                                                                                                     |
| --------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `auth.ts`       | JWT auth + user context  | Verifies token, enforces same-day `loginDate`, hydrates `c.var.auth`; KV session cache first, D1 fallback.                        |
| `permission.ts` | RBAC + field permissions | Exports `requireRole`, `requireSiteAdmin`, `requirePermission`, plus inline check helpers.                                        |
| `attendance.ts` | Check-in gate            | Site membership check, same-day attendance window, manual approval fallback; bypasses when KV `fas-status=down`.                  |
| `rate-limit.ts` | DO-backed throttling     | Talks to `RATE_LIMITER` DO via `checkLimit`; returns 503 on limiter error; `authRateLimitMiddleware()` sets stricter auth limits. |
| `analytics.ts`  | API metrics capture      | Dual-write: Analytics Engine + D1 `apiMetrics` upsert; non-blocking `waitUntil` write.                                            |
| `fas-auth.ts`   | FAS ingress auth         | Validates `X-FAS-API-Key` against `FAS_API_KEY` or `FAS_SYNC_SECRET`.                                                             |

## MODULE SNAPSHOT

- Runtime middleware files: 8 (`*.ts`, excluding `__tests__/`).
- Tests present for each middleware contract under `middleware/__tests__/`.
- `cors` behavior test exists, but CORS implementation lives in `src/index.ts` chain.

## PATTERNS

- Auth-first for protected handlers; permission checks run after `c.var.auth` exists.
- Use response helpers for guard failures (`error(...)`), not raw thrown strings.
- Keep limiter key derivation stable (`user:{id}` or `ip:{addr}`) to preserve rate history.
- Metrics write paths must never block response lifecycle.

## GOTCHAS/WARNINGS

- `rate-limit.ts` fails closed on DO call errors (503), not permissive pass-through.
- `attendance.ts` behavior changes with `REQUIRE_ATTENDANCE_FOR_POST` and per-site `accessPolicies.requireCheckin`.
- `auth.ts` session validity depends on same-day rule, not long-lived JWT expiry.
