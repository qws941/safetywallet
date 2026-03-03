# AGENTS: E2E/WORKER

## SCOPE DELTA

- Worker PWA browser suites only.
- Shared E2E policy inherited from `e2e/AGENTS.md`.

## INVENTORY

- Support file: `helpers.ts`.
- Spec files: 16.

## SPEC SET (13)

- `actions.spec.ts`
- `announcements.spec.ts`
- `full-scenario-after-login.spec.ts`
- `home.spec.ts`
- `login.spec.ts`
- `mobile-visual.spec.ts`
- `points.spec.ts`
- `posts.spec.ts`
- `profile.spec.ts`
- `register.spec.ts`
- `smoke.spec.ts`
- `uiux-after-login.spec.ts`
- `votes.spec.ts`

## MODULE RULES

- Reuse `workerLogin(page)` + helper utilities for auth/setup.
- Keep Korean UI assertion coverage for auth/core navigation paths.
- Keep PWA/responsive checks in smoke/login/mobile suites.
- Preserve rate-limit handling and reset paths from helper utilities.
- Use configured base URL/env; no hardcoded host strings.

## ENV CONTRACT

- Worker creds fallback:
  - `E2E_WORKER_NAME`
  - `E2E_WORKER_PHONE`
  - `E2E_WORKER_DOB`
- Admin helper creds for unlock/sync flows:
  - `E2E_ADMIN_USERNAME`
  - `E2E_ADMIN_PASSWORD`

## ANTI-DRIFT

- No duplicated manual login flow across all specs.
- No stale reduced spec list.
- No fixed sleep timing replacing locator waits.
