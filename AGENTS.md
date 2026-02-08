# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-08  
**Commit:** 0744957  
**Branch:** main

## OVERVIEW

SafetyWallet - Construction site safety reporting PWA. Turborepo monorepo with Cloudflare Workers backend (Hono + Drizzle ORM) and two Next.js 14 frontends deployed to CF Pages.

## STRUCTURE

```
safework2/
├── apps/
│   ├── api-worker/       # Cloudflare Workers API (Hono + Drizzle)
│   ├── worker-app/       # Next.js 14 Worker PWA (CF Pages, port 3000)
│   └── admin-app/        # Next.js 14 Admin Dashboard (CF Pages, port 3001)
├── packages/
│   ├── types/            # Shared TypeScript types, 12 enums, 70+ DTOs
│   └── ui/               # shadcn/ui component library (13 components)
├── docker/               # Development Docker Compose
├── docs/                 # PRD, implementation plans, status docs
└── .sisyphus/            # AI agent planning artifacts
```

## WHERE TO LOOK

| Task                  | Location                           | Notes                           |
| --------------------- | ---------------------------------- | ------------------------------- |
| Add API endpoint      | `apps/api-worker/src/routes/`      | Hono routes, 17 modules         |
| Add/modify DB table   | `apps/api-worker/src/db/schema.ts` | Drizzle ORM, 26 tables          |
| Add shared type/DTO   | `packages/types/src/`              | Export via barrel in `index.ts` |
| Add UI component      | `packages/ui/src/components/`      | shadcn conventions              |
| Add worker page       | `apps/worker-app/src/app/`         | Next.js 14 App Router           |
| Add admin page        | `apps/admin-app/src/app/`          | Next.js 14 App Router           |
| Configure CF bindings | `apps/api-worker/wrangler.toml`    | D1, R2, KV, DO, CRON            |
| Add middleware        | `apps/api-worker/src/middleware/`  | Manual invocation pattern       |

## CODE MAP

### Entry Points

| App        | Entry                | Framework  | Port        |
| ---------- | -------------------- | ---------- | ----------- |
| api-worker | `src/index.ts`       | Hono 4     | - (Workers) |
| worker-app | `src/app/layout.tsx` | Next.js 14 | 3000        |
| admin-app  | `src/app/layout.tsx` | Next.js 14 | 3001        |

### Key Modules

| Module     | Location                              | Purpose                                      |
| ---------- | ------------------------------------- | -------------------------------------------- |
| Auth       | `api-worker/src/routes/auth.ts`       | JWT login, refresh, logout, lockout          |
| Admin      | `api-worker/src/routes/admin.ts`      | User/post/site management, stats, CSV export |
| Education  | `api-worker/src/routes/education.ts`  | Courses, materials, quizzes                  |
| Posts      | `api-worker/src/routes/posts.ts`      | Safety reports with R2 images                |
| Attendance | `api-worker/src/routes/attendance.ts` | FAS sync, daily check-in                     |
| Sites      | `api-worker/src/routes/sites.ts`      | Site management, memberships                 |
| Approvals  | `api-worker/src/routes/approvals.ts`  | Review workflow approvals                    |
| Votes      | `api-worker/src/routes/votes.ts`      | Monthly worker voting                        |
| Points     | `api-worker/src/routes/points.ts`     | Point ledger, balance                        |
| DB Schema  | `api-worker/src/db/schema.ts`         | Drizzle ORM, 26 tables, 16 enums             |

### CRON Scheduled Jobs

| Schedule      | Purpose                    | Location                         |
| ------------- | -------------------------- | -------------------------------- |
| `*/5 * * * *` | FAS attendance sync        | `src/index.ts` scheduled handler |
| `0 0 1 * *`   | Monthly points calculation | `src/index.ts` scheduled handler |
| `0 3 * * 0`   | Sunday cleanup             | `src/index.ts` scheduled handler |

## CONVENTIONS

### Code Style

- **TypeScript strict mode** everywhere
- **Barrel exports** in packages (index.ts re-exports)
- **Path aliases**: `@/` → `src/` in apps
- **All pages `'use client'`** — zero React Server Components
- **No ESLint/Prettier** — typecheck only quality gate

### Naming

- **Files**: kebab-case (`auth.guard.ts`, `create-post.dto.ts`)
- **DB fields**: snake_case via Drizzle column definitions
- **API routes**: `/` prefix (Hono Workers)

### API Response Format

```typescript
// Response helpers — context c is FIRST param
success(c, data); // { success: true, data, timestamp }
error(c, code, msg); // { success: false, error: { code, message }, timestamp }
```

### Authentication

- **JWT**: Uses `loginDate` field (NOT standard `exp`), daily reset at 5 AM KST
- **PII**: HMAC-SHA256 hashed (phoneHash, dobHash)
- **Refresh**: UUID token, rotated on each refresh

### Middleware Pattern

```typescript
// Middleware called manually inside handlers (NOT Hono .use())
await attendanceMiddleware(
  c,
  async () => {
    /* handler */
  },
  siteId,
);
```

## ANTI-PATTERNS (THIS PROJECT)

| Pattern                            | Why Forbidden                          |
| ---------------------------------- | -------------------------------------- |
| `as unknown as Type`               | Defeats TypeScript safety              |
| `as any`                           | Defeats TypeScript safety              |
| `confirm()` / `alert()`            | Use modal components instead           |
| `console.*` in production          | Use structured logging                 |
| `Record<string, unknown>` for DTOs | Use strict Zod schemas                 |
| Padding crypto keys with "0"       | Use proper key derivation              |
| `Promise.resolve()` mocks          | Never ship placeholder implementations |

### Known Violations (TODO)

- `apps/api-worker/src/routes/approvals.ts:34` — `as any`
- `apps/worker-app/src/app/posts/new/page.tsx:167` — `as any`
- `apps/admin-app/src/hooks/use-api.ts:309` — `Promise.resolve()` placeholder

## COMMANDS

```bash
# Development
npm run dev              # Start all apps (Turborepo)
npm run dev:worker       # Start worker-app only
npm run dev:admin        # Start admin-app only

# Database (Drizzle Kit)
npx drizzle-kit generate # Generate migration SQL
npx drizzle-kit push     # Push schema to D1
npx drizzle-kit studio   # Open Drizzle Studio

# Build & Deploy
npm run build            # Build all apps
tsc --noEmit             # Typecheck (only quality gate)

# Docker
docker compose -f docker/docker-compose.yml up -d
```

## CI/CD

| Workflow   | Trigger    | Steps                                        |
| ---------- | ---------- | -------------------------------------------- |
| CI         | Push/PR    | typecheck → parallel matrix build            |
| Production | Manual/tag | build → parallel deploy (Workers + 2× Pages) |
| Staging    | Manual     | sequential single-job deploy                 |

## CLOUDFLARE BINDINGS

| Binding      | Type | Name               | Purpose                            |
| ------------ | ---- | ------------------ | ---------------------------------- |
| DB           | D1   | safework2-db       | SQLite database (Drizzle)          |
| IMAGES       | R2   | safework2-images   | Image storage                      |
| SESSIONS     | KV   | safework2-sessions | Session cache (not yet used)       |
| RATE_LIMITER | DO   | RateLimiter        | Rate limiting (declared, not used) |

## NOTES

- **5 AM KST cutoff**: All "today" logic uses Korea timezone with 5 AM as day boundary
- **Package manager**: npm (declared in package.json)
- **No test infrastructure**: Zero test files, frameworks, or coverage
- **Static export**: Both Next.js apps use `output: 'export'` — no SSR
- **@cloudflare/next-on-pages**: Adapter for CF Pages deployment
- **Enum sync**: 12 enums in `packages/types` MUST match Drizzle schema enums (4 additional enums are schema-only)
- **Vestigial file**: `pnpm-workspace.yaml` exists but npm is used (not pnpm)
