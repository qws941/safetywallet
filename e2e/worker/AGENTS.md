# AGENTS: WORKER-APP

## DELTA SCOPE

Worker PWA browser suites only.
Root e2e rules inherited.

## CURRENT FILE SET

- `helpers.ts` worker login/site-bootstrap/rate-limit unlock utilities
- `smoke.spec.ts`
- `login.spec.ts`
- `register.spec.ts`
- `posts.spec.ts`
- `full-scenario-after-login.spec.ts`
- `uiux-after-login.spec.ts`
- `mobile-visual.spec.ts`

## MODULE RULES

- Reuse `workerLogin(page)` helper for authenticated flows.
- Keep worker unlock/sync path through admin API helpers intact.
- Keep Korean text assertions on login and key CTA paths.
- Keep PWA/meta/responsive checks in login/mobile suites.
- Keep protected-route behavior assertions tolerant to SPA timing.

## ENV CONTRACT

- Worker creds from env fallbacks:
  - `E2E_WORKER_NAME`
  - `E2E_WORKER_PHONE`
  - `E2E_WORKER_DOB`
- Admin assist creds for unlock/sync:
  - `E2E_ADMIN_USERNAME`
  - `E2E_ADMIN_PASSWORD`

## ANTI-DRIFT

- Do not duplicate worker login form flow in each spec.
- Do not remove rate-limit reset handling from helper paths.
- Do not hardcode API domain in specs; use config/env base URL.
