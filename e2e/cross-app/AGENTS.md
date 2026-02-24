# AGENTS: CROSS-APP

## DELTA SCOPE

Cross-surface smoke/integration only.
Single suite file.

## CURRENT FILE SET

- `integration.spec.ts`

## MODULE RULES

- Keep tri-surface checks coupled:
  - API health
  - Worker app reachability
  - Admin app reachability
- Keep CORS OPTIONS checks for both worker and admin origins.
- Keep response-time budget check (`< 30s`) for cold-start tolerance.
- Keep login readiness assertion tolerant: URL or visible login/loading UI.

## ENDPOINT DEFAULTS

- `API_URL` -> `https://safetywallet.jclee.me/api`
- `WORKER_APP_URL` -> `https://safetywallet.jclee.me`
- `ADMIN_APP_URL` -> `https://admin.safetywallet.jclee.me`

## ANTI-DRIFT

- Do not add feature-level business assertions here.
- Do not narrow CORS validation to one origin.
- Do not convert resilient smoke checks into brittle redirect-only checks.
