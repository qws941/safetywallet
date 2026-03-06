# AGENTS: MIDDLEWARE

## PURPOSE

Request gate and telemetry middleware set for API routes.
Owns auth/permission/attendance/rate-limit/analytics/header layers.

## INVENTORY

- Runtime middleware files (7): `analytics.ts`, `attendance.ts`, `auth.ts`, `permission.ts`, `rate-limit.ts`, `request-logger.ts`, `security-headers.ts`.
- Test files (8): `analytics.test.ts`, `attendance.test.ts`, `auth.test.ts`, `cors.test.ts`, `permission.test.ts`, `rate-limit.test.ts`, `request-logger.test.ts`, `security-headers.test.ts` in `__tests__/`.

## CONVENTIONS

- Keep auth guard first when downstream middleware requires auth context.
- Keep role/permission checks in `permission.ts`; keep attendance-specific policy in `attendance.ts`.
- Keep limiter adapter contract thin; durable-object semantics stay in `src/durable-objects/RateLimiter.ts`.
- Keep middleware return paths deterministic for status and envelope shape.

## ANTI-PATTERNS

- Do not move route business logic into middleware modules.
- Do not add dynamic CORS assembly here; keep in entrypoint composition.
- Do not silently pass through failed auth/permission/limit checks.
- Do not mutate auth context schema without synchronized consumer updates.

## DRIFT GUARDS

- Check middleware file list against `src/middleware` directory before edits.
- Check every middleware module has a corresponding test in `src/middleware/__tests__/`.
- Check `src/index.ts` chain order after adding/removing middleware.
- Check durable-object action names consumed by `rate-limit.ts` still exist.
