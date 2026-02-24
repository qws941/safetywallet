# AGENTS: API

## DELTA SCOPE

API project (`request` fixture) only.
No browser UI assertions here.

## CURRENT FILE SET

- `smoke.spec.ts` health/auth/CORS/basic 404 smoke
- `endpoints.spec.ts` deep auth/protected/admin/CORS/error/format matrix

## MODULE RULES

- Keep auth lifecycle checks serial where token state is reused.
- Accept documented variability (`400|401|403|404|429`) per endpoint intent.
- Keep 429 handling explicit for login-heavy sequences.
- Assert both transport and envelope (`status` + `success/data/error/timestamp`).
- Keep admin-origin CORS validation (`ADMIN_APP_URL` origin).

## DATA INPUTS

- Worker login fixture values from env fallbacks:
  - `E2E_WORKER_NAME`
  - `E2E_WORKER_PHONE`
  - `E2E_WORKER_DOB`

## ANTI-DRIFT

- Do not store static bearer tokens in repo.
- Do not silently pass on response-body regressions.
- Do not collapse endpoint coverage into smoke-only checks.
