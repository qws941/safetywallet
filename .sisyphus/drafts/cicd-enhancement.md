# Draft: CI/CD Enhancement for SafetyWallet

## Requirements (confirmed)

- [from user]: SafetyWallet uses Cloudflare Native stack (Workers, D1, R2, KV, Pages)
- [from user]: Current CI has lint → build → test, deploy has API worker deployment

## Identified Issues (from user)

1. Admin-app NOT deployed - No Cloudflare Pages setup
2. Slow R2 upload - Shell loop, no parallelization, no cache headers
3. No caching - npm ci, prisma generate repeated in every job
4. Test services mismatch - Using Postgres/Redis but app uses D1/KV
5. Hyperdrive placeholder - wrangler.toml has PLACEHOLDER_HYPERDRIVE_ID
6. No staging environment - Only production deploy

## Enhancement Goals (from user)

1. Add admin-app deployment to Cloudflare Pages
2. Optimize R2 upload with wrangler bulk upload or parallel
3. Add GitHub Actions caching (npm, prisma)
4. Fix test job to use D1 (miniflare) instead of Postgres
5. Add staging environment workflow
6. Add deployment notifications (Slack/Discord optional)
7. Add rollback capability
8. Path-based conditional deployment (only deploy changed apps)

## Open Questions

- Slack webhook available for notifications?
- Discord preferred over Slack?
- Staging environment: separate CF account or same with preview?
- R2 bucket naming for staging vs production?
- What triggers staging deploy: PR, manual, specific branch?
- Worker-app deploy strategy: also Pages, or current R2?

## Research Findings

### From Explore Agent (Codebase Analysis)

**Current Workflow Structure:**

- ci.yml: lint+typecheck → build (3 apps matrix) → test (postgres+redis services)
- deploy.yml: wait for CI → build worker-app only → R2 shell loop → wrangler deploy

**CRITICAL ISSUES IDENTIFIED:**

1. **Admin-app NOT deployed** - deploy.yml only builds/deploys worker-app
2. **Hyperdrive placeholder** - FAS_HYPERDRIVE has PLACEHOLDER_HYPERDRIVE_ID (line 67 wrangler.toml)
3. **R2 upload no error handling** - silent fail, no feedback
4. **Test-prod mismatch** - tests use Postgres+Redis, production uses D1/KV
5. **Manual dispatch bypasses CI** - can deploy broken code via workflow_dispatch
6. **API endpoint inconsistency** - NEXT_PUBLIC_API_URL="/api" but wrangler.toml says full URL

**Unused Bindings:**

- KV namespace exists but sessions in-memory
- Durable Objects RateLimiter declared, no implementation

**Lint Issue:** ESLint disabled due to zod/eslint-config-next conflict

### From Librarian Agent (Best Practices)

**R2 Bulk Upload:**

- ❌ No native wrangler bulk command
- ✅ AWS CLI S3 sync recommended (works with R2 via endpoint URL)
- Alternative: GNU parallel with wrangler put

**Miniflare for D1:**

- Use `wrangler d1 migrations apply --local`
- Tests use `unstable_dev` from wrangler for local workerd runtime
- No Docker/Postgres needed

**Pages Staging:**

- Branch aliases: `staging.<project>.pages.dev`
- Access control available for preview deployments
- PR previews auto-generated

**Path-Based Workflows:**

```yaml
on:
  push:
    paths:
      - "apps/api-worker/**"
      - "packages/database/**"
```

**Caching:**

- `actions/setup-node@v4` with `cache: 'npm'`
- Turbo cache: persist `.turbo` directory

## Technical Decisions

- [pending user response]

## Scope Boundaries

- INCLUDE: CI/CD workflow enhancement
- INCLUDE: Cloudflare Pages for admin-app
- EXCLUDE: (to be determined based on clarifications)
