# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-27
**Branch:** master

<!-- WARNING: This file is a sync target from qws941/.github via BetaHuhn/repo-file-sync-action.
     Pushes to master on the .github repo will overwrite this file.
     To persist safetywallet-specific content, remove AGENTS.md from .github/sync.yml Group 1. -->

## OVERVIEW

SafetyWallet — industrial safety compliance platform. Turborepo monorepo with Hono API worker, Next.js 14 PWA for field workers, and Next.js 14 admin dashboard. All deployed on Cloudflare (Workers + Pages). Korean-language UI with i18n support.

## STRUCTURE

```text
./
├── apps/
│   ├── api-worker/          # Hono + Drizzle + D1 — CF Worker (REST API)
│   ├── worker-app/           # Next.js 14 PWA — field worker UI (port 3000)
│   └── admin-app/            # Next.js 14 dashboard — admin UI (port 3001)
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
├── playwright.config.ts      # 5 projects: api, admin-setup, worker-app, admin-app, cross-app
├── wrangler.toml             # CF Worker config — 10 bindings, dev/prod envs
└── package.json              # Workspaces: apps/*, packages/*
```

## WHERE TO LOOK

| Task                   | Location                                  | Notes                                              |
| ---------------------- | ----------------------------------------- | -------------------------------------------------- |
| API routes             | `apps/api-worker/src/routes/`             | 18 route modules + admin subtree                   |
| API middleware         | `apps/api-worker/src/middleware/`         | Auth, CORS, logging, analytics, security headers   |
| Database schema        | `apps/api-worker/src/db/schema.ts`        | 32 Drizzle tables on Cloudflare D1                 |
| DB migrations          | `apps/api-worker/migrations/`             | Sequential SQL migrations                          |
| Durable Objects        | `apps/api-worker/src/durable-objects/`    | RateLimiter DO                                     |
| Scheduled tasks (cron) | `apps/api-worker/src/scheduled/`          | \*/5min, monthly, weekly Sun 3am, daily 9pm        |
| Validators             | `apps/api-worker/src/validators/`         | Zod schemas for request validation                 |
| Worker PWA pages       | `apps/worker-app/src/app/`                | Next.js App Router pages                           |
| Admin dashboard pages  | `apps/admin-app/src/app/`                 | attendance, posts, votes, education sections       |
| Shared types/DTOs      | `packages/types/src/`                     | dto/ and i18n/ subdirectories                      |
| Shared UI components   | `packages/ui/src/components/`             | Cross-app reusable components                      |
| E2E tests              | `e2e/`                                    | api/, admin-app/, worker-app/, cross-app/, shared/ |
| CI/CD                  | `.github/workflows/`                      | ci.yml + deploy-monitoring.yml (CF Git deploys)    |
| Deploy monitoring      | `.github/workflows/deploy-monitoring.yml` | Post-deploy health + Slack notify                  |
| Requirement specs      | `docs/requirements/`                      | PRD, implementation plan, feature checklist        |

## CONVENTIONS

### Tech Stack

- **Runtime**: Node 20, TypeScript strict, Turborepo
- **API**: Hono framework on Cloudflare Workers, Drizzle ORM on D1 (SQLite)
- **Frontend**: Next.js 14 App Router, React 18, Zustand stores, TanStack Query
- **Testing**: Vitest (unit, 5 workspace configs), Playwright (E2E, 5 projects)
- **Formatting**: Prettier, 2-space indent, Husky + lint-staged pre-commit

### Cloudflare Bindings (10)

| Binding              | Type             | Purpose                             |
| -------------------- | ---------------- | ----------------------------------- |
| `DB`                 | D1               | Primary database (32 tables)        |
| `IMAGES_BUCKET`      | R2               | User-uploaded images                |
| `BACKUP_BUCKET`      | R2               | Database backups                    |
| `ASSETS_BUCKET`      | R2               | Static assets / admin SPA           |
| `FAS_DB`             | Hyperdrive       | External FAS MariaDB connection     |
| `CACHE`              | KV               | Key-value cache                     |
| `ANALYTICS`          | Analytics Engine | Request/event analytics             |
| `NOTIFICATION_QUEUE` | Queue            | Async notification processing       |
| `NOTIFICATION_DLQ`   | Queue (DLQ)      | Dead letter queue for failed notifs |
| `AI`                 | Workers AI       | AI inference                        |

RateLimiter Durable Object exported from `src/durable-objects/RateLimiter.ts`.

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

- Vitest workspace config at root with 5 project configs (api-worker, admin-app, worker-app, types, ui)
- Playwright 5 projects: `api` (API tests), `admin-setup` (auth fixture), `worker-app`, `admin-app`, `cross-app`
- ~1554 tests across 147 files
- Run: `npm test` (unit via Turbo), `npm run test:e2e` (Playwright)

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
- RateLimiter implemented as Cloudflare Durable Object
- Offline-first PWA with local queue sync in worker-app

## COMMANDS

```bash
# Development
npm run dev                    # Start all apps via Turbo
npm run build                  # Build all workspaces
npm run typecheck              # TypeScript check all workspaces
npm run lint                   # Lint all workspaces
npm run format:check           # Prettier check

# Testing
npm test                       # Vitest unit tests (all workspaces)
npm run test:e2e               # Playwright E2E tests
npm run test:e2e:smoke         # Smoke tests only

# Database
npm run db:generate            # Generate Drizzle migrations

# Verification
npm run verify                 # Full verification script
npm run git:preflight          # Pre-push checks
npm run check:wrangler-sync    # Verify wrangler.toml consistency
npm run lint:naming            # Validate file/dir naming conventions
```

## NOTES

- This AGENTS.md is a sync target from `qws941/.github` — it may be overwritten by the upstream sync workflow. To keep safetywallet-specific content, remove `AGENTS.md` from the sync target list in the `.github` repo's `sync.yml`.
- Node version pinned to 20 via `.nvmrc`.
- `wrangler.toml` contains both dev and production environment configs.
- 45 subdirectory AGENTS.md files exist across the monorepo providing module-level context.
- Deployment flow: push → CI → CF Git Integration → R2 sync → D1 migrate → smoke test → Slack notify.
