## Overview

- SafetyWallet is an industrial safety compliance platform with a field-worker PWA, an admin dashboard, and a Cloudflare Worker API.
- Production deploys are Git-ref driven via Cloudflare Git Integration; manual deploy scripts are disabled.

## Tech Stack

- Runtime: Node 20, npm 10 (from `package.json`, `.nvmrc`).
- Language: TypeScript (strict mode in `packages/types/tsconfig.json`).
- Monorepo: Turborepo (`turbo.json`).
- API: Hono + Drizzle ORM on Cloudflare Workers/D1 (`apps/api/package.json`, `wrangler.toml`).
- Web: Next.js 15 + React 18 for admin/worker apps (`apps/admin/package.json`, `apps/worker/package.json`).
- Testing: Vitest workspace + Playwright E2E (`vitest.config.ts`, `playwright.config.ts`).

## Directory Structure

```
.
├── apps/
│   ├── api/                 # Cloudflare Worker API (Hono + D1)
│   ├── admin/               # Next.js admin dashboard (port 3001)
│   └── worker/              # Next.js worker PWA (port 3000)
├── packages/
│   ├── types/               # Shared TS types + i18n data
│   └── ui/                  # Shared UI components
├── e2e/                     # Playwright E2E tests (api/admin/worker/cross-app)
├── docs/                    # PRD, requirements checklist, ops runbooks
├── scripts/                 # Repo tooling (verify, naming lint, checks)
├── .github/workflows/       # CI/CD and automation workflows
├── wrangler.toml            # Root CF Worker config + bindings
├── turbo.json               # Turborepo pipeline
└── vitest.config.ts         # Vitest workspace config
```

## Core Components

- API Worker: `apps/api/src/index.ts` (entry), deployed via `wrangler.toml` and `apps/api/wrangler.toml`.
- Admin App: Next.js App Router at `apps/admin/src/app/`.
- Worker App: Next.js App Router at `apps/worker/src/app/` with PWA support (`apps/worker/package.json`).
- Shared Types/I18n: `packages/types/src/` and `packages/types/src/i18n/`.
- Shared UI: `packages/ui/src/`.

## Data Flow

- Client → API: Admin/Worker apps call API endpoints under `https://safetywallet.jclee.me/api` (defaults in `playwright.config.ts`).
- API → Data Stores:
  - D1 database via `DB` binding (`wrangler.toml`).
  - Hyperdrive connection for external FAS DB via `FAS_HYPERDRIVE` (`wrangler.toml`).
  - R2 buckets for assets/images via `R2`/`ACETIME_BUCKET` (`wrangler.toml`).
  - KV caching via `KV` (`wrangler.toml`).
  - Queues for notification delivery (`NOTIFICATION_QUEUE`, DLQ) (`wrangler.toml`).
- Observability: Analytics Engine + ELK log shipping (`wrangler.toml`, `docs/requirements/ELK_INDEX_PREFIX_REQUIREMENTS.md`).
- AI: Workers AI binding `AI` for inference (`wrangler.toml`).

## External Integrations

- Cloudflare Workers/D1/R2/KV/Queues/Analytics/AI (`wrangler.toml`).
- ElasticSearch for log shipping (config in `docs/requirements/ELK_INDEX_PREFIX_REQUIREMENTS.md`).
- Custom domains and routes (`wrangler.toml`, `docs/cloudflare-operations.md`).

## Configuration

- Environment: `.env`, `.env.example` (root).
- Cloudflare bindings: `wrangler.toml`, `apps/api/wrangler.toml`.
- Repo formatting: `.editorconfig`, Prettier scripts in `package.json`.
- Linting: Next.js ESLint configs in `apps/admin/.eslintrc.json`, `apps/worker/.eslintrc.json`.
- Testing: `vitest.config.ts`, `playwright.config.ts`.

## Build & Deploy

- Build: `npm run build` (Turborepo build + static bundle copy to `dist/`).
- Typecheck: `npm run typecheck` (workspace).
- Tests: `npm test` (Vitest), `npm run test:e2e` (Playwright).
- Deploy: Git-ref based CI only; manual deploy scripts exit non-zero (`package.json`, `apps/api/package.json`).
- Ops runbook: `docs/cloudflare-operations.md`.

## Notes / Inconsistencies

- Some docs reference `apps/api-worker` while the current repo uses `apps/api` (see `docs/cloudflare-operations.md` vs `apps/api/`).
