# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-27
**Branch:** master

<!-- WARNING: This file is a sync target from qws941/.github via BetaHuhn/repo-file-sync-action.
     Pushes to master on the .github repo will overwrite this file.
     To persist safetywallet-specific content, remove AGENTS.md from .github/sync.yml Group 1. -->

## OVERVIEW

SafetyWallet — industrial safety compliance platform. Turborepo monorepo with Hono API worker, Next.js 15 PWA for field workers, and Next.js 15 admin dashboard. All deployed on Cloudflare (Workers + Pages). Korean-language UI with i18n support.

## STRUCTURE

```text
./
├── apps/
│   ├── api/                 # Hono + Drizzle + D1 — CF Worker (REST API)
│   ├── worker/              # Next.js 15 PWA — field worker UI (port 3000)
│   └── admin/               # Next.js 15 dashboard — admin UI (port 3001)
├── packages/
│   ├── types/                # @safetywallet/types — shared TS types, DTOs, i18n
│   └── ui/                   # Shared UI components
├── e2e/                      # Playwright E2E tests (5 projects)
├── scripts/                  # Operational scripts (lint, verify, migrate, sync)
├── docs/                     # PRD, implementation plans, feature checklists
│   └── requirements/         # Detailed requirement specs
├── .github/workflows/        # 14 GitHub Actions workflows
├── turbo.json                # Pipeline: build/dev/lint/typecheck/test/test:e2e/clean
├── vitest.config.ts          # Workspace vitest: 5 project configs
├── playwright.config.ts      # 5 projects: api, admin-setup, worker, admin, cross-app
├── wrangler.toml             # CF Worker config — 11 bindings, dev/prod envs
└── package.json              # Workspaces: apps/*, packages/*
```

## WHERE TO LOOK

| Task                  | Location                        | Notes                                            |
| --------------------- | ------------------------------- | ------------------------------------------------ |
| API routes            | `apps/api/src/routes/`          | 18 route modules + admin subtree                 |
| API middleware        | `apps/api/src/middleware/`      | Auth, CORS, logging, analytics, security headers |
| Database schema       | `apps/api/src/db/schema.ts`     | 32 Drizzle tables on Cloudflare D1               |
| DB migrations         | `apps/api/migrations/`          | Sequential SQL migrations                        |
| Durable Objects       | `apps/api/src/durable-objects/` | RateLimiter + JobScheduler DOs                   |
| Scheduled jobs (cron) | `apps/api/src/jobs/`            | Daily, monthly, sync — via JobScheduler DO       |
| Validators            | `apps/api/src/validators/`      | Zod schemas for request validation               |
| Worker PWA pages      | `apps/worker/src/app/`          | Next.js App Router pages                         |
| Admin dashboard pages | `apps/admin/src/app/`           | attendance, posts, votes, education sections     |
| Shared types/DTOs     | `packages/types/src/`           | dto/ and i18n/ subdirectories                    |
| Shared UI components  | `packages/ui/src/components/`   | Cross-app reusable components                    |
| E2E tests             | `e2e/`                          | api/, admin/, worker/, cross-app/, shared/       |
| CI/CD                 | `.github/workflows/`            | ci.yml + deploy-monitoring.yml (health + Slack)  |
| Requirement specs     | `docs/requirements/`            | PRD, implementation plan, feature checklist      |

## CONVENTIONS

### Tech Stack

- **Runtime**: Node 20, TypeScript strict, Turborepo
- **API**: Hono framework on Cloudflare Workers, Drizzle ORM on D1 (SQLite)
- **Frontend**: Next.js 15 App Router, React 18, Zustand stores, TanStack Query
- **Testing**: Vitest (unit, 5 workspace configs), Playwright (E2E, 5 projects)
- **Formatting**: Prettier, 2-space indent, Husky + lint-staged pre-commit

### Cloudflare Bindings (11)

| Binding              | Type             | Purpose                         |
| -------------------- | ---------------- | ------------------------------- |
| `DB`                 | D1               | Primary database (32 tables)    |
| `ASSETS`             | R2 (assets)      | Static assets / admin SPA       |
| `R2`                 | R2 (bucket)      | User-uploaded images            |
| `ACETIME_BUCKET`     | R2 (bucket)      | Attendance records storage      |
| `FAS_HYPERDRIVE`     | Hyperdrive       | External FAS MariaDB connection |
| `KV`                 | KV               | Key-value cache                 |
| `ANALYTICS`          | Analytics Engine | Request/event analytics         |
| `NOTIFICATION_QUEUE` | Queue            | Async notification processing   |
| `AI`                 | Workers AI       | AI inference                    |
| `RATE_LIMITER`       | Durable Object   | Request rate limiting           |
| `JOB_SCHEDULER`      | Durable Object   | Scheduled job execution         |

### API Middleware Chain (order matters)

1. `initFasConfig` → 2. `securityHeaders` → 3. `requestLoggerMiddleware` → 4. `analyticsMiddleware` → 5. `honoLogger` → 6. dynamic CORS (`ALLOWED_ORIGINS` env)

### API Routes (18 modules)

`auth`, `attendance`, `votes`, `recommendations`, `posts`, `actions`, `users`, `sites`, `announcements`, `points`, `reviews`, `fas`, `disputes`, `policies`, `approvals`, `education`, `images`, `notifications` + `admin/` subtree

### Deployment

- **Manual deploy is disabled** — all deploy scripts exit with error
- **Production**: Push to `master` → CF Git Integration auto-deploys → deploy-monitoring → Slack notify
- **CF Git Integration**: Cloudflare auto-deploys on push to master
- **Pipeline**: R2 asset sync → D1 migration → smoke test → production verify

### Commit and PR Conventions

- **Conventional Commits**: `type(scope): imperative summary` (≤72 chars, lowercase)
- **Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`, `perf`, `build`, `revert`
- **Merge policy**: Squash merge only
- **PR size**: ~200 LOC max
- SHA-pin all GitHub Actions with `# vN` version comment

### Testing

- Vitest (5 workspace configs: api, admin, worker, types, ui) + Playwright (5 projects: api, admin-setup, worker, admin, cross-app)
- ~1554 tests across 147 files. Run: `npm test` (unit), `npm run test:e2e` (E2E)

## ANTI-PATTERNS (THIS PROJECT)

- Never run deploy commands locally — deploy is CI-only via push to master
- Never use `as any`, `@ts-ignore`, `@ts-expect-error` in TypeScript
- Never use empty catch blocks `catch(e) {}`
- Never use mutable GitHub Action tags (`@v4`) — always SHA-pin
- Never hardcode secrets or credentials — use CF environment bindings
- Never use merge commits — squash merge only
- Worker-app has legacy `safework2_` key prefixes in offline queue/draft storage — do not rename without migration

## UNIQUE STYLES

- Korean-language UI with i18n support via `packages/types/src/i18n/`
- Dual database: D1 (primary, SQLite) + Hyperdrive (external FAS MariaDB)
- Admin SPA served as static files from R2 via catch-all route in api-worker
- Notification queue with dead-letter queue pattern for reliable delivery
- RateLimiter + JobScheduler implemented as Cloudflare Durable Objects
- Offline-first PWA with local queue sync in worker-app

## COMMANDS

```bash
npm run dev                    # Start all apps via Turbo
npm run build                  # Build all workspaces
npm run typecheck              # TypeScript check all workspaces
npm run lint                   # Lint all workspaces
npm run format:check           # Prettier check
npm test                       # Vitest unit tests (all workspaces)
npm run test:e2e               # Playwright E2E tests
npm run test:e2e:smoke         # Smoke tests only
npm run db:generate            # Generate Drizzle migrations
npm run verify                 # Full verification script
npm run git:preflight          # Pre-push checks
npm run check:wrangler-sync    # Verify wrangler.toml consistency
npm run lint:naming            # Validate file/dir naming conventions
```

## NOTES

- Node version pinned to 20 via `.nvmrc`.
- 45 subdirectory AGENTS.md files exist across the monorepo providing module-level context.
