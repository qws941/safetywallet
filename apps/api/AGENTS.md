# AGENTS: API-WORKER

## PURPOSE

Worker runtime entrypoint. Route mounting, global middleware chain, queue/scheduled wiring, SPA fallback serving.
Child AGENTS files own module detail; this file only integration map.

## KEY FILES

| File            | Role                | Current Facts                                                                                                                |
| --------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`  | Runtime composition | 412 lines. Builds `app` + `/api` sub-app. Exports `{ app }`, `RateLimiter`, `JobScheduler`, default `fetch/scheduled/queue`. |
| `src/types.ts`  | Binding contract    | `Env` includes D1, R2/STATIC, KV, optional DO/Hyperdrive/Analytics/AI/Queue bindings.                                        |
| `wrangler.toml` | Deployment bindings | Source of truth for runtime binding names consumed by `Env`.                                                                 |

## ROUTE REGISTRATION SNAPSHOT

- `/api` sub-app mounts 18 core route modules: `auth`, `attendance`, `votes`, `recommendations`, `posts`, `actions`, `users`, `sites`, `announcements`, `points`, `reviews`, `fas`, `disputes`, `policies`, `approvals`, `education`, `images`, `notifications`.
- `/api/admin` mounted via `adminRoute` subtree.
- Direct endpoints in `index.ts`: `GET /api/health`, `GET /api/system/status`, `POST /api/fas-sync`, `api.all("*")` 404 JSON.

## MIDDLEWARE CHAIN (`index.ts`)

- `app.use("*", initFasConfig)` first; hydrates FAS config from env each request.
- Then global chain: `securityHeaders` -> `requestLoggerMiddleware` -> `analyticsMiddleware` -> `honoLogger()` -> dynamic CORS.
- CORS reads `ALLOWED_ORIGINS`, allows localhost fallback, sets `Device-Id` / `X-Device-Id` headers.

## RUNTIME FLOWS

- **Scheduled:** `scheduled(controller, env, ctx)` delegates to `JobScheduler` DO via `src/jobs/registry.ts`.
- **Queue:** `processNotificationBatch(batch, env)` handles `NOTIFICATION_QUEUE` messages.
- **Static fallback:** hostname switch (`admin.*` => `admin/` prefix). Missing asset falls back to index HTML from `STATIC` bucket.

## GOTCHAS/WARNINGS

- `api.post("/fas-sync")` uses raw `c.json(...)` response shape; not `success()` helper.
- `GET /api/system/status` also returns manual envelope (`success/data/timestamp`) for outage banner contract.
- Route 404 handler must stay before `app.route("/api", api)` static catch-all; order is behavior-critical.
- `types.ts` currently contains prefixed line noise in source; avoid mass edits without full regression pass.
