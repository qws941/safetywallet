# AGENTS: API-WORKER

## OVERVIEW

Cloudflare Workers REST API. Hono 4 framework, Drizzle ORM with D1 (SQLite), 36 route modules, 8 middleware, 9 CRON jobs.

## STRUCTURE

```
src/
├── index.ts           # Entry: Hono app + CRON handlers
├── routes/            # 19 core + 17 admin route modules
├── middleware/        # Manual invocation guards
├── db/schema.ts       # Drizzle schema definitions
├── lib/               # Shared utilities (response, crypto, audit, logger)
├── scheduled/         # CRON handlers and schedulers
├── durable-objects/   # RateLimiter DO
└── validators/        # Zod request schemas
```

## WHERE TO LOOK

| Task       | Location           | Notes                                   |
| ---------- | ------------------ | --------------------------------------- |
| Add Route  | `src/routes/`      | Export `Hono` app, mount in `index.ts`  |
| DB Schema  | `src/db/schema.ts` | Drizzle ORM. Run `drizzle-kit generate` |
| Migrations | `migrations/`      | Ordered SQL + `meta/_journal.json`      |
| Bindings   | `wrangler.toml`    | D1, R2, KV, DO, CRON, Hyperdrive, AI    |
| Helpers    | `src/lib/`         | response, crypto, audit, logger, sms    |
| Validation | `src/validators/`  | Zod schemas for request bodies          |
| CRON Jobs  | `src/scheduled/`   | FAS sync, overdue checks, PII cleanup   |

## SUBMODULE DOCS

- `src/routes/AGENTS.md`: Root route inventory and cross-cutting route patterns
- `src/routes/admin/AGENTS.md`: Admin-only route rules (`.use('*', authMiddleware)` exception)
- `src/middleware/AGENTS.md`: Middleware invocation and guard patterns
- `src/lib/AGENTS.md`: Utility module inventory by domain
- `src/db/AGENTS.md`: Schema and migration constraints
- `migrations/AGENTS.md`: Migration ordering, journal metadata, and apply workflow
- `src/scheduled/AGENTS.md`: CRON schedule matrix and lock/retry rules
- `src/validators/AGENTS.md`: Zod schema conventions and enum parity checks
- `src/durable-objects/AGENTS.md`: Durable Object rate limiter rules and state model

## SCHEDULED TASKS (9 CRON jobs)

| Schedule    | Jobs                                                       |
| ----------- | ---------------------------------------------------------- |
| Every 5 min | FAS incremental sync, AceTime R2 sync, metrics alert check |
| Daily 21:00 | FAS full sync, overdue action check, PII lifecycle cleanup |
| Weekly Sun  | Data retention cleanup (3-year TTL)                        |
| Monthly 1st | Month-end points snapshot, auto-nomination of top earners  |

## CF BINDINGS

| Binding            | Type       | Purpose                                    |
| ------------------ | ---------- | ------------------------------------------ |
| DB                 | D1         | Primary SQLite database                    |
| R2 (×3)            | R2 Bucket  | Images, static, AceTime photos             |
| FAS_HYPERDRIVE     | Hyperdrive | MariaDB (FAS employee data)                |
| KV                 | KV         | Cache, sessions, sync locks                |
| NOTIFICATION_QUEUE | Queue      | Push notification delivery                 |
| QUEUE_DLQ          | Queue      | Dead-letter queue for failed notifications |
| RATE_LIMITER       | DO         | Rate limiting                              |
| AI                 | Workers AI | Hazard classification, face blur           |
| ANALYTICS          | Analytics  | API metrics                                |

## CONVENTIONS

- **Manual Middleware**: Invoke manually in handlers (e.g., `await verifyAuth(c)`). NO global `.use()`.
- **Drizzle ORM**: Use query builder (`db.select()`). NO raw SQL.
- **Context**: `c` (Hono Context) is always the first arg to helpers.
- **PII**: Hash sensitive data (phone, DOB) using `src/lib/crypto.ts` (HMAC-SHA256).
- **Auth**: JWT `loginDate` claim (daily reset 5 AM KST).
- **Audit**: State-changing ops call `logAuditWithContext()`. On failure, log via structured logger; do not silently swallow errors.
- **Validation**: All POST/PATCH use `zValidator("json", Schema)`.

## ANTI-PATTERNS

- **No Global Middleware**: Keep `index.ts` clean (except analytics).
- **No `as any`**: Strict type safety. Refactor existing violations.
- **No `console.log`**: Use `src/lib/logger.ts` for structured logs.
- **No In-Memory State**: Use KV or D1 (Workers are ephemeral).
- **No Raw SQL**: Always use Drizzle query builder.
