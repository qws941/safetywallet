# AGENTS: E2E

## SCOPE DELTA

- Playwright project wiring + root inventory only.
- Feature assertions belong to child folders.

## PROJECT MAP (`playwright.config.ts`)

- `api` -> `e2e/api`
- `admin-setup` -> `e2e/admin/admin.setup.ts`
- `worker` -> `e2e/worker`
- `admin` -> `e2e/admin` (depends on `admin-setup`)
- `cross-app` -> `e2e/cross-app`

## CURRENT COUNTS

- Total E2E specs: 64.
- `e2e/admin`: 30 specs (+ `admin.setup.ts`, `helpers.ts`).
- `e2e/api`: 20 specs.
- `e2e/worker`: 13 specs.
- `e2e/cross-app`: 1 spec.
- Shared utilities: `e2e/shared/elk.ts`, `e2e/utils/rate-limit.ts`, `e2e/utils/token-cache.ts`.

## BASELINES

- Default worker URL: `https://safetywallet.jclee.me`.
- Default admin URL: `https://admin.safetywallet.jclee.me`.
- Default API URL: `https://safetywallet.jclee.me/api`.
- CI retries: enabled (`2`), local retries: `0`.
- `@smoke` tagging drives smoke slices.

## ROOT RULES

- Keep cross-project wiring in config, not duplicated per spec.
- Keep admin auth state path stable: `e2e/admin/.auth/admin.json`.
- Use env overrides (`API_URL`, `WORKER_APP_URL`, `ADMIN_APP_URL`) instead of hardcoded test hosts.
- Preserve project boundaries; avoid folder spillover assertions.
- Keep total-testing context in mind: 294 Vitest files + 64 Playwright specs.

## SUBMODULE DOCS

- `e2e/admin/AGENTS.md`
- `e2e/api/AGENTS.md`
- `e2e/worker/AGENTS.md`
- `e2e/cross-app/AGENTS.md`
