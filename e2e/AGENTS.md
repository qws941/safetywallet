# AGENTS: E2E

## SCOPE

Playwright E2E suite root. Project wiring only.
Child folders own feature-level test behavior.

## ACTIVE PROJECT MAP

Source of truth: `playwright.config.ts`.

- `api` -> `e2e/api`
- `admin-setup` -> `e2e/admin/admin.setup.ts`
- `worker` -> `e2e/worker`
- `admin` -> `e2e/admin` (depends on `admin-setup`)
- `cross-app` -> `e2e/cross-app`

## CURRENT TREE (ROOT VIEW)

- `e2e/admin/` admin dashboard browser suites
- `e2e/worker/` worker PWA browser suites
- `e2e/api/` request-context API suites
- `e2e/cross-app/` multi-surface health/cors suite
- `e2e/shared/elk.ts` shared ELK helper
- `e2e/utils/rate-limit.ts` retry/reset parsing helper

## BASELINES

- Production-first defaults from config:
  - Worker: `https://safetywallet.jclee.me`
  - Admin: `https://admin.safetywallet.jclee.me`
  - API: `https://safetywallet.jclee.me/api`
- CI retries enabled; local retries disabled.
- `@smoke` tag drives deploy verification selection.

## ROOT RULES

- Keep cross-project wiring in config, not duplicated in specs.
- Keep setup-state contract stable: `e2e/admin/.auth/admin.json`.
- Prefer env override path (`API_URL`, `WORKER_APP_URL`, `ADMIN_APP_URL`).
- Preserve project boundaries; no feature spill across folders.

## SUBMODULE DOCS

- `e2e/admin/AGENTS.md`
- `e2e/api/AGENTS.md`
- `e2e/worker/AGENTS.md`
- `e2e/cross-app/AGENTS.md`

## QUICK RUN

- All: `npx playwright test`
- Smoke slice: `npx playwright test --grep @smoke`
- Project slice: `npx playwright test --project=api`
