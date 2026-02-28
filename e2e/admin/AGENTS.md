# AGENTS: ADMIN-APP

## DELTA SCOPE

Admin-app browser suites only.
Root `e2e/AGENTS.md` covers shared policies.

## CURRENT FILE SET

- `admin.setup.ts` auth bootstrap, writes storage state
- `helpers.ts` `adminLogin`, `expectAdminShellVisible`, sidebar helpers
- `smoke.spec.ts`
- `login.spec.ts`
- `auth.spec.ts`
- `dashboard.spec.ts`
- `navigation.spec.ts`
- `pages.spec.ts`
- `mobile-visual.spec.ts`
- `hamburger.spec.ts`
- `uiux-after-login.spec.ts`
- `posts.spec.ts`
- `members.spec.ts`
- `attendance.spec.ts`
- `points.spec.ts`
- `announcements.spec.ts`
- `education.spec.ts`
- `education-registration.spec.ts`
- `rewards.spec.ts`
- `settings.spec.ts`
- `monitoring.spec.ts`
- `actions.spec.ts`
- `audit.spec.ts`

## MODULE RULES

- Reuse `adminLogin(page)` for authenticated flows.
- Treat `AdminRateLimitError` as known environment blocker signal.
- Keep sidebar coverage aligned with `SIDEBAR_ITEMS` export.
- Keep Korean UI assertions (`로그인`, labels) stable.
- Keep unauthenticated checks explicit in smoke/login suites.

## ANTI-DRIFT

- Do not duplicate auth bootstrap outside `admin.setup.ts` or helper.
- Do not hardcode absolute domains inside specs.
- Do not replace locator-based waits with fixed sleeps.
