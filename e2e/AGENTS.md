# E2E

## PURPOSE

- Playwright E2E coverage for admin dashboard and worker PWA.
- Auth setup + smoke + authenticated project split.

## INVENTORY

- `AGENTS.md` — local E2E governance.
- `auth/admin-setup.ts` — admin login setup, saves storage state.
- `auth/worker-setup.ts` — worker login setup, saves storage state.
- `admin/smoke.spec.ts` — unauthenticated admin smoke checks.
- `admin/dashboard.spec.ts` — authenticated admin dashboard flow.
- `admin/navigation.spec.ts` — admin sidebar navigation flow.
- `admin/login.spec.ts` — admin login form and validation.
- `admin/posts.spec.ts` — post management filters, search, data table.
- `admin/members.spec.ts` — member management search and table.
- `admin/attendance.spec.ts` — attendance stats and sync link.
- `admin/education.spec.ts` — education management tabs.
- `admin/votes.spec.ts` — vote management month picker and cards.
- `admin/points.spec.ts` — points management, manual award form, links.
- `admin/announcements.spec.ts` — announcement CRUD, AI draft, delete dialog.
- `admin/approvals.spec.ts` — approval queue with pending/history tabs.
- `admin/actions.spec.ts` — action management stats, filters, data table.
- `admin/issues.spec.ts` — issue management, create dialog, state filter.
- `admin/settings.spec.ts` — settings form, save button, site config.
- `worker/smoke.spec.ts` — unauthenticated worker smoke checks.
- `worker/home.spec.ts` — authenticated worker home flow.
- `worker/navigation.spec.ts` — worker bottom nav flow.
- `worker/login.spec.ts` — worker login form fields.
- `worker/posts.spec.ts` — post list filters, new post form.
- `worker/education.spec.ts` — education tabs (contents/quizzes/TBM).
- `worker/votes.spec.ts` — recommendation form and history.
- `worker/points.spec.ts` — points balance, leaderboard, history.
- `worker/announcements.spec.ts` — announcement list with type badges.
- `worker/profile.spec.ts` — profile info, push toggle, logout.
- `worker/actions.spec.ts` — actions list with status filters.
- `.auth/` — generated storageState cache directory (gitignored).
- Playwright projects in root config: `admin-setup`, `worker-setup`, `worker-smoke`, `admin-smoke`, `worker`, `admin`.

## CONVENTIONS

- Keep auth setup code only in `e2e/auth/*-setup.ts`.
- Keep authenticated projects dependent on setup projects.
- Keep smoke specs credential-free and side-effect free.
- Use `op run --env-file=.env.e2e` for credentials injection.
- Keep local webServer alignment with ports 3000 (worker) and 3001 (admin).
- Preserve CI profile (`retries: 2`, `workers: 1`, `reporter: github`).

## ANTI-PATTERNS

- Hardcoded credentials or secret literals in specs.
- Committed `.auth/*.json` storage state artifacts.
- Setup/login logic duplicated inside non-setup specs.
- Cross-project test coupling that breaks isolated project execution.

## DRIFT GUARDS

- Confirm `e2e/` tree remains 5 top-level entries.
- Confirm auth subdir contains 2 files, admin subdir contains 15 files, worker subdir contains 11 files.
- Confirm Playwright project list in `playwright.config.ts` remains 6 projects.
- Confirm testDir/testMatch mapping stays aligned with actual spec locations.
