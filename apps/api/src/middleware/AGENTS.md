# AGENTS: MIDDLEWARE

## PURPOSE

Cross-route request guards and observability hooks.
Scope: auth context, permission checks, attendance gate, rate limit, security headers, request metrics/logging.

## FILES/STRUCTURE

- Runtime middleware files: 7
  - `analytics.ts`
  - `attendance.ts`
  - `auth.ts`
  - `permission.ts`
  - `rate-limit.ts`
  - `request-logger.ts`
  - `security-headers.ts`
- Tests in `__tests__/`: analytics, attendance, auth, permission, rate-limit, request-logger, security-headers, plus CORS behavior coverage.

## CURRENT FACTS

- `auth.ts` validates bearer JWT, enforces same-day `loginDate`, hydrates `c.set("auth", ...)`, uses KV session cache then D1 fallback.
- `attendance.ts` bypasses for admin roles and `KV["fas-status"] === "down"`; enforces check-in or manual approval by site/day.
- `permission.ts` exposes `requireRole`, `requireSiteAdmin`, `requirePermission`, plus `checkSiteAdmin` and `checkPermission` helpers.
- `rate-limit.ts` calls `RATE_LIMITER` DO action `checkLimit`; hard-fails with 503 on limiter error.
- `analytics.ts` updates request metrics (`apiMetrics`) and should remain non-blocking.

## CONVENTIONS

- Run auth middleware before permission/attendance checks in route modules.
- Keep auth failures as `HTTPException(401)` where auth context is mandatory.
- Keep rate-limit key shape stable (`user:*`, `ip:*`, `auth:*`) to preserve bucket history.
- Keep attendance window logic bound to `getTodayRange()` to match KST day semantics.

## ANTI-PATTERNS

- Do not document or reference `fas-auth.ts`; it is not present in this directory.
- Do not bypass limiter errors with permissive fallthrough.
- Do not mutate `c.var.auth` shape without updating all routes and tests using auth context.
- Do not move CORS implementation into this folder; it is composed in `src/index.ts`.
