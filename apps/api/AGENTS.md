# API

## PURPOSE

Cloudflare Workers Hono API for `apps/api`, composed in `src/index.ts`.
Owns middleware sequence, `/api` route mounts, queue consumption, R2 media serving, and static asset fallback.

## FILE INVENTORY

| Path                        | Type              | Notes                                                        |
| --------------------------- | ----------------- | ------------------------------------------------------------ |
| `drizzle.config.ts`         | config            | Drizzle migration/generate config for D1                     |
| `wrangler.toml`             | config            | Worker bindings, routes, environments                        |
| `worker-configuration.d.ts` | generated types   | Binding type declarations                                    |
| `migrations/`               | schema history    | SQL migrations + Drizzle meta snapshots                      |
| `src/index.ts`              | runtime entry     | Middleware chain, route mounts, queue handler                |
| `src/routes/`               | route layer       | 13 top-level route files + 5 feature subdirs + admin subtree |
| `src/lib/`                  | shared services   | 25 runtime `.ts` modules + `fas/` + `fas-mariadb/`           |
| `src/middleware/`           | request controls  | 7 middleware modules                                         |
| `src/db/`                   | database contract | Drizzle schema + batch helpers                               |
| `src/durable-objects/`      | stateful runtimes | `RateLimiter`, `JobScheduler`                                |
| `src/jobs/`                 | scheduler logic   | registry + daily/monthly/sync jobs                           |
| `src/validators/`           | request schemas   | 3 top-level validator modules + shared schemas               |
| `src/__tests__/`            | integration tests | `helpers.ts`, `index.test.ts`, `types.test.ts`               |

## BINDINGS (WRANGLER)

| Binding              | Type                     | Purpose                       |
| -------------------- | ------------------------ | ----------------------------- |
| `DB`                 | D1                       | Primary relational data store |
| `R2`                 | R2                       | User media storage            |
| `ASSETS`             | Workers Static Assets    | Frontend static fallback      |
| `ACETIME_BUCKET`     | R2                       | Acetime dataset bucket        |
| `FAS_HYPERDRIVE`     | Hyperdrive               | FAS MariaDB connectivity      |
| `KV`                 | KV Namespace             | Session/cache/system flags    |
| `ANALYTICS`          | Analytics Engine         | API metrics ingestion         |
| `NOTIFICATION_QUEUE` | Queue                    | Notification async processing |
| `AI`                 | Workers AI               | Image/privacy AI operations   |
| `RATE_LIMITER`       | Durable Object namespace | Request/OTP throttling        |
| `JOB_SCHEDULER`      | Durable Object namespace | Cron-like job orchestration   |

## RUNTIME FLOW

- Middleware order in `src/index.ts`: `initFasConfig` -> `securityHeaders` -> `requestLoggerMiddleware` -> `analyticsMiddleware` -> `honoLogger` -> dynamic `cors`.
- Route mounts under `/api`: 18 feature modules (`auth` through `notifications`) plus `/admin` subtree and `/admin/scheduler` bridge.
- Direct endpoints in entrypoint: `GET /api/health`, `GET /api/system/status`, `POST /api/fas-sync`.
- API catch-all stays inside `api`: `api.all("*")` JSON 404 envelope.
- Root app handles `GET /r2/*` media and static fallback from `ASSETS` (`admin.*` host rewrite to `/admin/*`).

## CHILD AGENTS

- `src/routes/AGENTS.md`
- `src/routes/admin/AGENTS.md`
- `src/routes/__tests__/AGENTS.md`
- `src/lib/AGENTS.md`
- `src/lib/__tests__/AGENTS.md`
- `src/middleware/AGENTS.md`
- `src/db/AGENTS.md`
- `src/durable-objects/AGENTS.md`
- `src/jobs/AGENTS.md`
- `src/validators/AGENTS.md`
- `migrations/AGENTS.md`

## CONVENTIONS

- Keep envelope responses on route handlers through `src/lib/response.ts` helpers.
- Preserve middleware ordering because auth context, observability, and CORS behavior are order-dependent.
- Keep CORS allow-headers compatible with mobile clients (`Device-Id`, `X-Device-Id`).
- Keep queue consumer delegation in entrypoint routed through `processNotificationBatch`.

## ANTI-PATTERNS

- Do not register feature routes both in `src/index.ts` and feature routers.
- Do not move `/api` routes into static fallback branches.
- Do not change `/api/fas-sync` secret-gate contract without coordinating callers.
