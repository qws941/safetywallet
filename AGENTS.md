# PROJECT KNOWLEDGE BASE: SAFETYWALLET

**Generated:** 2026-02-23 17:19:00 KST
**Commit:** 5bd639a
**Branch:** master

## OVERVIEW

SafetyWallet — Construction site safety reporting PWA. Turborepo monorepo: Cloudflare Workers API (Hono 4 + Drizzle ORM + D1) backend, two Next.js 14 static-export frontends (Worker PWA + Admin Dashboard), shared packages for types and UI.

## STRUCTURE

```
safetywallet/
├── apps/
│   ├── api-worker/        # Cloudflare Workers API (Hono + Drizzle + D1)
│   ├── worker-app/        # Next.js 14 Worker PWA (static export, port 3000)
│   └── admin-app/         # Next.js 14 Admin Dashboard (static export, port 3001)
├── packages/
│   ├── types/             # Shared TS types, enums, DTOs, i18n keys
│   └── ui/                # Shared shadcn/ui + Tailwind v4 component library
├── e2e/                   # Playwright E2E tests (5 projects, production-first)
├── scripts/               # Build, deployment, hash, and sync helpers (tsx)
├── docs/                  # PRDs, requirement docs, runbooks
└── .sisyphus/             # AI agent planning artifacts
```

## WHERE TO LOOK

| Task               | Location                            | Notes                                       |
| :----------------- | :---------------------------------- | :------------------------------------------ |
| Add API endpoint   | `apps/api-worker/src/routes/`       | 19 core + 17 admin Hono route modules       |
| Add admin endpoint | `apps/api-worker/src/routes/admin/` | Global `.use('*', authMiddleware)`          |
| Modify DB schema   | `apps/api-worker/src/db/schema.ts`  | Drizzle ORM, 33 tables                      |
| Manage migrations  | `apps/api-worker/migrations/`       | Ordered SQL + `meta/_journal.json`          |
| Add middleware     | `apps/api-worker/src/middleware/`   | 8 middleware modules                        |
| Add shared DTO     | `packages/types/src/dto/`           | `*Dto` suffix, type-only, barrel export     |
| Edit i18n strings  | `packages/types/src/i18n/ko.ts`     | Shared Korean localization keys             |
| UI Components      | `packages/ui/src/components/`       | 14 shadcn components, CVA variants          |
| Worker App pages   | `apps/worker-app/src/app/`          | 16 pages, client-only, Korean UI            |
| Admin App pages    | `apps/admin-app/src/app/`           | 29 pages, 17 feature dirs                   |
| CI/Deploy workflow | `.github/workflows/`                | 9 workflows, verify-only (CF deploys)       |
| CF Bindings        | `apps/api-worker/wrangler.toml`     | D1, R2×3, KV, DO, Queue+DLQ, AI, Hyperdrive |
| E2E Tests          | `e2e/`                              | 5 Playwright projects, production URLs      |
| Unit Tests         | `*/__tests__/`                      | Vitest, co-located with source              |
| Scheduled Tasks    | `apps/api-worker/src/scheduled/`    | 9 CRONs across 4 schedules                  |
| Product docs       | `docs/`                             | PRD v1.1 + 4 requirement docs               |

## AGENTS HIERARCHY

- Root: `AGENTS.md`
- Ops/pipeline: `.github/AGENTS.md`, `.github/workflows/AGENTS.md`
- App/package level: `apps/api-worker/AGENTS.md`, `apps/worker-app/AGENTS.md`, `apps/admin-app/AGENTS.md`, `packages/types/AGENTS.md`, `packages/ui/AGENTS.md`, `e2e/AGENTS.md`, `scripts/AGENTS.md`, `docs/AGENTS.md`
- Data submodules: `apps/api-worker/migrations/AGENTS.md`, `packages/types/src/dto/AGENTS.md`, `packages/types/src/i18n/AGENTS.md`
- API deep modules: `apps/api-worker/src/routes/AGENTS.md`, `apps/api-worker/src/routes/__tests__/AGENTS.md`, `apps/api-worker/src/routes/admin/AGENTS.md`, `apps/api-worker/src/middleware/AGENTS.md`, `apps/api-worker/src/lib/AGENTS.md`, `apps/api-worker/src/lib/__tests__/AGENTS.md`, `apps/api-worker/src/db/AGENTS.md`, `apps/api-worker/src/scheduled/AGENTS.md`, `apps/api-worker/src/validators/AGENTS.md`, `apps/api-worker/src/durable-objects/AGENTS.md`
- Frontend deep modules: `apps/admin-app/src/app/AGENTS.md`, `apps/admin-app/src/app/attendance/AGENTS.md`, `apps/admin-app/src/app/posts/AGENTS.md`, `apps/admin-app/src/app/votes/AGENTS.md`, `apps/admin-app/src/app/education/AGENTS.md`, `apps/admin-app/src/hooks/AGENTS.md`, `apps/admin-app/src/hooks/__tests__/AGENTS.md`, `apps/admin-app/src/components/AGENTS.md`, `apps/admin-app/src/stores/AGENTS.md`, `apps/worker-app/src/lib/AGENTS.md`, `apps/worker-app/src/app/AGENTS.md`, `apps/worker-app/src/hooks/AGENTS.md`, `apps/worker-app/src/components/AGENTS.md`, `apps/worker-app/src/stores/AGENTS.md`, `apps/worker-app/src/i18n/AGENTS.md`
- E2E deep modules: `e2e/admin-app/AGENTS.md`, `e2e/api/AGENTS.md`, `e2e/worker-app/AGENTS.md`, `e2e/cross-app/AGENTS.md`
- Docs deep modules: `docs/requirements/AGENTS.md`

## CODE MAP

### Entry Points

| App        | Path                                 | Framework  | Port    |
| :--------- | :----------------------------------- | :--------- | :------ |
| api-worker | `apps/api-worker/src/index.ts`       | Hono 4     | Workers |
| worker-app | `apps/worker-app/src/app/layout.tsx` | Next.js 14 | 3000    |
| admin-app  | `apps/admin-app/src/app/layout.tsx`  | Next.js 14 | 3001    |

### API Worker

- **19 core route modules**: auth, attendance, votes, posts, actions, users, sites, announcements, points, reviews, fas, disputes, policies, approvals, education, acetime, recommendations, images, notifications.
- **17 admin route modules**: fas, access-policies, posts, stats, images, helpers, users, attendance, votes, trends, monitoring, recommendations, audit, export, alerting, sync-errors.
- **8 middleware**: auth (JWT daily rotation 5AM KST), permission (RBAC), attendance, rate-limit (DO-backed), request-logger, analytics (5-min buckets), security-headers, fas-auth.
- **Global middleware chain**: security-headers → request-logger → analytics → CORS → hono-logger.
- **Catch-all**: SPA serving from R2, hostname-based routing (admin.\* → admin/, main → root).

### Worker App (PWA)

- **16 pages**: /, /home, /actions, /announcements, /education, /login, /points, /posts, /profile, /register, /votes + detail/form variants.
- **6 hooks**: use-api, use-auth, use-leaderboard, use-locale, use-push-subscription, use-translation.
- **State**: Single Zustand store (`safetywallet-auth`), `_hasHydrated` for static-export safety.
- **PWA**: Push notifications, offline submission queue, service worker.

### Admin App (Dashboard)

- **29 pages**: Dashboard, analytics, attendance/sync/unmatched, actions, announcements, approvals, audit, education, login, members, monitoring, points/policies, posts, recommendations, rewards, settings, sync-errors, votes/candidates.
- **17 hooks**: Domain-organized TanStack Query hooks with `["admin", "domain", ...params]` key pattern.
- **State**: Single Zustand store (`safetywallet-admin-auth`) with `isAdmin` computed.

### Shared Packages

- **types**: Barrel `index.ts` → enums, DTOs (`*Dto` suffix), API types, i18n keys. Build to `dist/`.
- **ui**: 14 shadcn components (alert-dialog, avatar, badge, button, card, dialog, input, select, sheet, skeleton, switch, toast, toaster, use-toast). Tailwind v4 + CVA.

## CONVENTIONS

- **Strict TypeScript**: No `any`, no `ignore`, all configs `strict: true`.
- **Barrel Exports**: Use `index.ts` for clean package imports.
- **Path Aliases**: `@/` maps to `src/` within applications.
- **Response Format**: Always use `success(c, data)` or `error(c, code, msg)` helpers → `{success, data/error, timestamp}`.
- **Authentication**: JWT based on `loginDate` with daily rotation at 5 AM KST. PII is HMAC-SHA256 hashed.
- **Zustand Store**: Auth and offline state managed exclusively via Zustand with `persist` middleware + `createJSONStorage(localStorage)`.
- **Offline First**: Submission queue logic to handle intermittent site connectivity.
- **Testing**: Vitest (unit, 60% backend / 50% frontend coverage thresholds) + Playwright (E2E, production-first, 5 projects).

## ANTI-PATTERNS

- **No `as any`**: Active removal of legacy type casts.
- **No Browser Dialogs**: Use UI modal components instead of `alert()` or `confirm()`.
- **No `console.log`**: Use structured logging for production observability (scripts exempt).
- **No Secrets in Git**: Specifically check `.env` and Wrangler/local config files.
- **No Manual Tokens**: Never use `localStorage` or cookies directly for JWTs; use Zustand stores.
- **No RSC (Worker App)**: Worker app follows Absolute Zero RSC policy; all pages/components use `'use client'`.
- **No Placeholder Promises**: Do not ship `Promise.resolve()` mocks.
- **No Manual Deploy**: Deploy script blocked; Cloudflare Git Integration handles all deployments.

## UNIQUE STYLES

- **5 AM KST Cutoff**: The logical "day" starts at 5:00 AM Korea Standard Time. `getTodayRange()` helper.
- **Worker App Client-Side Only**: `apps/worker-app` pages use `'use client'` (Zero RSC pattern).
- **Korean Localization**: The Worker PWA is fully localized in Korean via `packages/types/src/i18n/ko.ts`.
- **Review Workflow**: Strict state machine: `RECEIVED` → `IN_REVIEW` → `APPROVED`/`REJECTED`/`NEED_INFO`.
- **Admin Global Auth**: Only `apps/api-worker/src/routes/admin/` uses `.use('*', authMiddleware)`; all other routes apply auth per-handler.

## COMMANDS

```bash
npm run dev              # Start all apps via Turborepo
npm run dev:worker       # Start worker-app only (port 3000)
npm run dev:admin        # Start admin-app only (port 3001)
npm run build            # Full monorepo build
tsc --noEmit             # Global type check (Quality Gate)

# Database
npx drizzle-kit generate # Create DB migration SQL
npx drizzle-kit push     # Sync schema directly to D1

# Testing
npm run test             # Vitest unit tests (all apps)
npx playwright test      # E2E tests (requires running apps)

# CI
npm run lint             # ESLint across monorepo
npm run typecheck        # tsc --noEmit all packages
```

## NOTES

- **Package Manager**: npm (standardized; avoid pnpm).
- **Static Export**: Both `worker-app` and `admin-app` are static exports for CF Pages/R2.
- **Integration**: FAS (Foreign Attendance System) syncs via Hyperdrive (MariaDB) every 5 minutes.
- **Scheduled Tasks**: 9 CRON jobs across 4 schedules (5-min sync, daily overdue/PII, weekly retention, monthly settlement).
- **E2E Tests**: 1000+ lines Playwright; primary verification method. 5 projects: api, admin-setup, worker-app, admin-app, cross-app.
- **Scale**: ~80k LOC TypeScript, 36 route modules, 33 DB tables, 10 CF bindings.
- **Deployment**: Cloudflare Git Integration is the deployer. GitHub Actions workflows are verify-only (health poll → Playwright smoke).
- **Incident Automation**: 10-min CRON health monitor auto-creates/closes GitHub Issues.
