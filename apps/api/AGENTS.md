# AGENTS: API APP ROOT

## PURPOSE

Runtime composition for `apps/api/src/index.ts`.
Owns wiring only: middleware order, route mounts, queue/scheduler exports, static asset fallback.

## FILES/STRUCTURE

- `src/index.ts` - worker entrypoint and integration surface.
- `src/types.ts` - `Env` binding contract used by all route/middleware modules.
- `src/routes/` - API modules (core and admin subtree).
- `src/middleware/` - global and handler-level guards.
- `src/durable-objects/` + `src/jobs/` - scheduler/rate-limit runtime classes and job logic.

## CURRENT INTEGRATION FACTS

- `src/index.ts` exports `app`, `RateLimiter`, `JobScheduler`, and default `{ fetch, queue }`.
- `/api` mounts 18 route modules: `auth`, `attendance`, `votes`, `recommendations`, `posts`, `actions`, `users`, `sites`, `announcements`, `points`, `reviews`, `fas`, `disputes`, `policies`, `approvals`, `education`, `images`, `notifications`.
- `/api/admin` is mounted through `src/routes/admin/index.ts`.
- Direct endpoints defined in root file: `GET /api/health`, `GET /api/system/status`, `POST /api/fas-sync`.
- API catch-all exists: `api.all("*")` returns JSON 404 envelope.
- Static fallback branch serves from `ASSETS` and rewrites hostname `admin.*` to `/admin/*` asset path.

## CONVENTIONS

- Preserve middleware order in `src/index.ts`: `initFasConfig` -> `securityHeaders` -> `requestLoggerMiddleware` -> `analyticsMiddleware` -> `honoLogger` -> dynamic CORS.
- Keep CORS allow-headers aligned with mobile clients: `Device-Id`, `X-Device-Id`.
- Keep API 404 catch-all inside `api` app, before mounting static fallback on root app.
- Keep `/api/system/status` envelope stable (`success`, `data`, `timestamp`) for outage banner polling.
- Keep queue handler delegated to `processNotificationBatch` from `src/lib/notification-queue.ts`.

## ANTI-PATTERNS

- Do not move admin/worker-specific routes into static fallback block.
- Do not reorder middleware chain without checking auth, analytics, and CORS side effects.
- Do not duplicate route registration in both root app and sub-router modules.
- Do not change `/api/fas-sync` auth shape (`secret` gate) without updating operational callers.
