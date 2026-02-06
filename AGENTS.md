# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06  
**Branch:** main

## OVERVIEW

SafetyWallet - Construction site safety reporting PWA. Turborepo monorepo with Cloudflare Workers backend.

## STRUCTURE

```
safework2/
├── apps/
│   ├── api-worker/       # Cloudflare Workers API (Hono)
│   ├── worker-app/       # Next.js 14 Worker PWA (port 3000)
│   └── admin-app/        # Next.js 14 Admin Dashboard (port 3001)
├── packages/
│   ├── database/         # Prisma schema + client (18 entities)
│   ├── types/            # Shared TypeScript types, enums, DTOs
│   └── ui/               # shadcn/ui component library
├── docker/               # Development Docker Compose
├── docs/                 # PRD, implementation plans, status docs
└── .sisyphus/            # AI agent planning artifacts
```

## WHERE TO LOOK

| Task                  | Location                                 | Notes                                 |
| --------------------- | ---------------------------------------- | ------------------------------------- |
| Add API endpoint      | `apps/api-worker/src/routes/`            | Hono.js routes, use existing patterns |
| Add database entity   | `packages/database/prisma/schema.prisma` | Run `npm run db:generate` after       |
| Add shared type/DTO   | `packages/types/src/`                    | Export via barrel in `index.ts`       |
| Add UI component      | `packages/ui/src/components/`            | Follow shadcn conventions             |
| Add worker page       | `apps/worker-app/src/app/`               | Next.js 14 App Router                 |
| Add admin page        | `apps/admin-app/src/app/`                | Next.js 14 App Router                 |
| Configure CF bindings | `apps/api-worker/wrangler.toml`          | D1, R2, KV namespaces                 |

## CODE MAP

### Entry Points

| App        | Entry                | Framework  | Port        |
| ---------- | -------------------- | ---------- | ----------- |
| api-worker | `src/index.ts`       | Hono 4     | - (Workers) |
| worker-app | `src/app/layout.tsx` | Next.js 14 | 3000        |
| admin-app  | `src/app/layout.tsx` | Next.js 14 | 3001        |

### Key Modules

| Module     | Location                              | Purpose                       |
| ---------- | ------------------------------------- | ----------------------------- |
| Auth       | `api-worker/src/routes/auth.ts`       | JWT login, refresh, logout    |
| Posts      | `api-worker/src/routes/posts.ts`      | Safety reports with R2 images |
| Attendance | `api-worker/src/routes/attendance.ts` | FAS sync, daily check-in      |
| Sites      | `api-worker/src/routes/sites.ts`      | Site management, memberships  |
| Admin      | `api-worker/src/routes/admin.ts`      | User/post management, stats   |

## CONVENTIONS

### Code Style

- **TypeScript strict mode** everywhere
- **Barrel exports** in packages (index.ts re-exports)
- **Path aliases**: `@/` → `src/` in apps

### Naming

- **Files**: kebab-case (`auth.guard.ts`, `create-post.dto.ts`)
- **DB fields**: snake_case via `@map()` in Prisma
- **API routes**: `/` prefix (Hono Workers)

### API Response Format

```typescript
{ success: true, data: T, timestamp: string }
{ success: false, error: { code: string, message: string }, timestamp: string }
```

### Authentication

- **JWT**: 24h expiry, daily reset at 5 AM KST
- **PII**: HMAC-SHA256 hashed (phoneHash, dobHash)
- **Refresh**: UUID token, rotated on each refresh

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

- `apps/api-worker/src/lib/jwt.ts:36` - `as unknown as JwtPayload`
- `apps/api-worker/src/lib/response.ts:10,21` - `status as any`
- `apps/worker-app/src/app/profile/page.tsx:24` - `alert()` usage
- `apps/worker-app/src/app/join/page.tsx:76` - `alert()` usage

## COMMANDS

```bash
# Development
npm run dev              # Start all apps (Turborepo)
npm run dev:worker       # Start worker-app only

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio

# Build & Deploy
npm run build            # Build all apps
npm run lint             # Lint all apps

# Docker
docker compose -f docker/docker-compose.yml up -d
```

## CLOUDFLARE BINDINGS

| Binding | Type | Name             | Purpose                      |
| ------- | ---- | ---------------- | ---------------------------- |
| DB      | D1   | safework2-db     | SQLite database              |
| R2      | R2   | safework2-images | Image storage                |
| KV      | KV   | (configured)     | Session cache (not yet used) |

## NOTES

- **5 AM KST cutoff**: All "today" logic uses Korea timezone with 5 AM as day boundary
- **Package manager**: npm (declared in package.json), pnpm-workspace.yaml exists but unused
- **.sisyphus/**: AI agent planning directory - contains drafts, plans, evidence
- **No ESLint/Prettier configs**: Project relies on TypeScript strict mode only
