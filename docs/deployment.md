# SafetyWallet Deployment Guide

This guide covers the deployment process for the SafetyWallet monorepo using Cloudflare Workers, Pages, D1, and R2.

## Prerequisites

### GitHub Secrets Required

The following secrets must be configured in your GitHub repository (**Settings > Secrets and variables > Actions**) for automated deployments to work.

| Secret                  | Description                              | How to Get                                                  |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | API token with Workers/R2/D1 permissions | Cloudflare Dashboard → My Profile → API Tokens              |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID               | Cloudflare Dashboard → Workers → Account ID (right sidebar) |

### Creating Cloudflare API Token

1. Go to [Cloudflare Dashboard - API Tokens](https://dash.cloudflare.com/profile/api-tokens).
2. Click **Create Token**.
3. Use the **Edit Cloudflare Workers** template as a starting point.
4. Add/verify the following permissions:
   - **Account** → **Cloudflare D1** → **Edit**
   - **Account** → **R2** → **Edit**
   - **Account** → **Workers KV Storage** → **Edit**
   - **Account** → **Workers Scripts** → **Edit**
5. Set **Account Resources** to **Include** your specific account.
6. Set **Zone Resources** to **Include All zones** (or specific zones if applicable).
7. Click **Continue to summary**, then **Create Token**.
8. Copy the token immediately and save it as `CLOUDFLARE_API_TOKEN` in GitHub Secrets.

### Finding Cloudflare Account ID

1. Navigate to the **Workers & Pages** section in the Cloudflare Dashboard.
2. Your **Account ID** is displayed in the right sidebar.
3. Copy this value and save it as `CLOUDFLARE_ACCOUNT_ID` in GitHub Secrets.

## Cloudflare Resources Setup

Before the first deployment, ensure the following resources are created in your Cloudflare account.

### D1 Databases

Create these databases via the dashboard or wrangler:

- **Production**: `safework2-db`
  - Used for the primary production environment.
  - ID should be updated in `apps/api-worker/wrangler.toml`.
- **Staging**: `safework2-db-dev`
  - Used for testing and development.
  - ID should be configured in the `[env.dev]` section of `wrangler.toml`.

### R2 Buckets

Create these buckets in the R2 section:

- `safework2-images`: Stores user-uploaded safety report images and profile photos.
- `safework2-static`: Stores the static assets (HTML/JS/CSS) for the `worker-app` PWA.

### KV Namespaces

- `safework2-cache`: (Optional) Used for rate limiting and session caching if enabled.

## Deployment Workflows

### Production (main branch)

Pushing to the `main` branch triggers the `deploy.yml` GitHub Action.

```bash
git push origin main
```

**What gets deployed:**

- **API Worker**: Deployed to Cloudflare Workers.
- **Worker App**: Built as a static export and uploaded to the `safework2-static` R2 bucket.
- **Admin App**: Deployed to Cloudflare Pages.

### Staging (develop branch)

Pushing to the `develop` branch triggers the `deploy-staging.yml` GitHub Action.

```bash
git push origin develop
```

**What gets deployed:**

- **API Worker**: Deployed to the `dev` environment on Cloudflare Workers.

## Manual Deployment

If you need to deploy manually from your local machine, ensure you have `wrangler` authenticated.

### API Worker

```bash
cd apps/api-worker

# Deploy to Production
npm run deploy

# Deploy to Staging (dev environment)
npx wrangler deploy --env dev
```

### Worker App (PWA)

The Worker App is a Next.js application that runs as a PWA, served from R2.

```bash
cd apps/worker-app

# 1. Build the application
npm run build

# 2. Upload to R2 (Manual via Wrangler or Dashboard)
# Typically: npx wrangler r2 object put safework2-static/ --file ./out/
```

### Database Migrations

Apply migrations to the remote D1 databases:

```bash
# Production
npx wrangler d1 migrations apply safework2-db --remote

# Staging
npx wrangler d1 migrations apply safework2-db --remote --env dev
```

## Rollback

If a deployment fails or needs to be reverted, see [rollback.md](./rollback.md) for detailed procedures.
