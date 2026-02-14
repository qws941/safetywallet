# API-WORKER KNOWLEDGE BASE

**Primary Backend**: Hono REST API on Cloudflare Workers (D1, R2, KV).

## STRUCTURE

```
src/
├── index.ts           # Entry: Hono app + CRON handlers
├── routes/            # 19 modules (auth, admin, posts...)
├── middleware/        # 7 modules (manual invocation)
├── db/schema.ts       # Drizzle schema (32 tables)
├── lib/               # Utils: audit, crypto, JWT, response
└── validators/        # Zod schemas
```

## WHERE TO LOOK

| Task      | Location           | Notes                                   |
| --------- | ------------------ | --------------------------------------- |
| Add Route | `src/routes/`      | Export `Hono` app, mount in `index.ts`  |
| DB Schema | `src/db/schema.ts` | Drizzle ORM. Run `drizzle-kit generate` |
| Bindings  | `wrangler.toml`    | D1, R2, KV, DO, CRON                    |
| Helpers   | `src/lib/`         | `response.ts`, `crypto.ts`, `audit.ts`  |

## CONVENTIONS

- **Manual Middleware**: Invoke manually in handlers (e.g., `await verifyAuth(c)`). NO global `.use()`.
- **Drizzle ORM**: Use query builder (`db.select()`). NO raw SQL.
- **Context**: `c` (Hono Context) is always the first arg to helpers.
- **PII**: Hash sensitive data (phone, DOB) using `src/lib/crypto.ts` (HMAC-SHA256).
- **Auth**: JWT `loginDate` claim (daily reset 5 AM KST).

## ANTI-PATTERNS

- **No Global Middleware**: Keep `index.ts` clean (except analytics).
- **No `as any`**: Strict type safety. Refactor existing violations.
- **No `console.log`**: Use `src/lib/logger.ts` for structured logs.
- **No In-Memory State**: Use KV or D1 (Workers are ephemeral).
