# API

## PURPOSE

Cloudflare Workers Hono API. Runtime composition in `src/index.ts`.
Owns middleware chain, route mounts, queue consumer, static asset fallback.

## STRUCTURE

```
├── drizzle.config.ts          # Drizzle ORM config for D1
├── package.json
├── seed.sql                   # Development seed data
├── vitest.config.ts           # Test runner config
├── worker-configuration.d.ts  # Generated CF binding types
├── wrangler.toml              # Worker config, bindings, environments
├── migrations/                # D1 SQL migrations and snapshots
└── src/
    ├── index.ts               # Worker entrypoint, middleware chain, route mounts
    ├── types.ts               # Env binding contract
    ├── db/                    # Drizzle schema, migrations tooling
    ├── durable-objects/       # RateLimiter + JobScheduler DOs
    ├── jobs/                  # Scheduled job registry and implementations
    ├── lib/                   # Shared business logic (25 modules)
    ├── middleware/            # Request guards and observability hooks
    ├── routes/                # API route layer (/api/*)
    ├── utils/                 # Pure utility functions
    ├── validators/            # Zod request validators
    └── __tests__/             # Integration/unit tests
```

## BINDINGS (wrangler.toml)

| Binding            | Type                  | Purpose                        |
| ------------------ | --------------------- | ------------------------------ |
| DB                 | D1                    | Primary database               |
| R2                 | R2                    | Image storage                  |
| ASSETS             | Workers Static Assets | Static frontend files          |
| ACETIME_BUCKET     | R2                    | Acetime data                   |
| FAS_HYPERDRIVE     | Hyperdrive            | FAS MariaDB direct connection  |
| KV                 | KV Namespace          | Cache, sessions, feature flags |
| ANALYTICS          | Analytics             | Request metrics                |
| NOTIFICATION_QUEUE | Queue                 | Notification delivery pipeline |
| AI                 | Workers AI            | Hazard classification, privacy |
| RATE_LIMITER       | Durable Object        | Per-user/IP rate limiting      |
| JOB_SCHEDULER      | Durable Object        | Scheduled admin tasks          |

## MIDDLEWARE CHAIN ORDER

`initFasConfig` → `securityHeaders` → `requestLoggerMiddleware` → `analyticsMiddleware` → `honoLogger` → dynamic CORS

## ROUTE MOUNTS

18 modules under `/api`: auth, attendance, votes, recommendations, posts, actions, users, sites, announcements, points, reviews, fas, disputes, policies, approvals, education, images, notifications.

Admin subtree at `/api/admin` via `src/routes/admin/index.ts`.

Direct endpoints in `src/index.ts`: `GET /api/health`, `GET /api/system/status`, `POST /api/fas-sync`.

API catch-all: `api.all("*")` returns JSON 404 envelope.

R2 media serving: `GET /r2/*` serves user-uploaded images and videos from `R2` bucket with content-type detection and conditional caching.

Static fallback serves from `ASSETS`; hostname `admin.*` rewrites to `/admin/*` asset path.

## EXPORTS

`src/index.ts` exports: `app`, `RateLimiter`, `JobScheduler`, default `{ fetch, queue }`.

Queue consumer delegates to `processNotificationBatch` from `src/lib/notification-queue.ts`.

## CONVENTIONS

- Preserve middleware order — auth, analytics, CORS depend on sequence.
- CORS allow-headers include `Device-Id`, `X-Device-Id` for mobile clients.
- API 404 catch-all stays inside `api` app, before static fallback on root app.
- `/api/system/status` envelope: `{ success, data: { notices, hasIssues }, timestamp }`.
- Response helpers: `success()` / `error()` from `src/lib/response.ts`.

## ANTI-PATTERNS

- Do not move admin/worker routes into static fallback block.
- Do not reorder middleware chain without checking auth, analytics, CORS side effects.
- Do not duplicate route registration in both root app and sub-router modules.
- Do not change `/api/fas-sync` auth shape (`secret` gate) without updating callers.
