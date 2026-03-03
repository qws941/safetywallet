# AGENTS: E2E/CROSS-APP

## SCOPE DELTA

- Cross-surface integration smoke only.
- Single spec file: `integration.spec.ts`.

## TEST INTENT

- Validate API health endpoint availability.
- Validate worker app reachability.
- Validate admin app reachability.
- Validate CORS preflight behavior from worker/admin origins.
- Validate cold-start-tolerant response budget (`< 30s` guard).

## DEFAULT ENDPOINTS

- `API_URL`: `https://safetywallet.jclee.me/api`
- `WORKER_APP_URL`: `https://safetywallet.jclee.me`
- `ADMIN_APP_URL`: `https://admin.safetywallet.jclee.me`

## MODULE RULES

- Keep this suite smoke-level and resilient.
- Keep tri-surface checks together; avoid splitting into feature-domain suites.
- Keep login-readiness assertions tolerant to redirect/loading variability.
- Keep env override compatibility for all base URLs.

## ANTI-DRIFT

- No business-feature assertions.
- No one-origin-only CORS checks.
- No stale endpoint defaults.
