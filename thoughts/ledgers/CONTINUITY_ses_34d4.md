---
session: ses_34d4
updated: 2026-03-03T08:03:11.038Z
---

# Session Summary

## Goal
Verify 100% feature coverage of E2E tests across Admin app, Worker app, and API — identify any gaps where app routes/features exist but lack corresponding E2E test coverage.

## Constraints & Preferences
- Project root: `/home/jclee/dev/safetywallet/`
- Playwright E2E framework with 5 projects: `api`, `admin-setup`, `admin`, `worker`, `cross-app`
- Production URLs: `https://safetywallet.jclee.me` (worker), `https://admin.safetywallet.jclee.me` (admin)
- Tests hit production by default; overridable via env vars
- Korean-language app (송도세브란스 안전지갑)

## Progress
### Done
- [x] Mapped all **Admin app pages** (30 routes) from `apps/admin/src/app/` via Next.js App Router
- [x] Mapped all **Worker app pages** (16 routes) from `apps/worker/src/app/`
- [x] Mapped all **API route modules** (20 top-level + 16 admin sub-routes) from `apps/api/src/routes/`
- [x] Cataloged all **75 E2E spec files** (36 admin, 16 worker, 24 API, 1 cross-app)
- [x] Extracted all `test()` descriptions and `page.goto()` navigations from every spec file
- [x] Identified skipped tests (`test.skip`) — mostly conditional on auth availability
- [x] Confirmed shared helpers: `e2e/shared/elk.ts`, `e2e/utils/`, `e2e/AGENTS.md`

### In Progress
- [ ] Cross-reference analysis: match every app route/feature to its E2E test coverage → produce gap report

### Blocked
- Initial `npx playwright test` run timed out after 5 minutes (300s timeout) — actual test execution not completed

## Key Decisions
- **Investigation-only approach**: User asked "기능 100프로 커버리지 검증" — interpreted as audit/verification of coverage completeness, not writing new tests
- **Static analysis over runtime**: Since test execution timed out, focus on static mapping of routes ↔ spec files

## Next Steps
1. **Produce the cross-reference coverage matrix** — map each admin page, worker page, and API route to its corresponding E2E spec(s)
2. **Identify gaps** — routes/features with NO E2E coverage
3. **Identify weak coverage** — routes with only smoke-level tests but no functional tests
4. **Check for orphaned tests** — tests that reference routes/features that no longer exist
5. **Generate final coverage report** with percentages and specific gap list

## Critical Context

### Admin App Pages (30 routes) → E2E Specs (36 files)
| Route | E2E Spec(s) |
|-------|-------------|
| `/` (root) | `smoke.spec.ts` |
| `/login` | `login.spec.ts`, `pages.spec.ts`, `smoke.spec.ts`, `auth.spec.ts` |
| `/dashboard` | `dashboard.spec.ts`, `auth.spec.ts`, `navigation.spec.ts` |
| `/dashboard/analytics` | `dashboard-analytics.spec.ts` |
| `/dashboard/recommendations` | `dashboard-recommendations.spec.ts` |
| `/members` | `members.spec.ts` |
| `/members/[id]` | `member-detail.spec.ts` |
| `/posts` | `posts.spec.ts` |
| `/posts/[id]` | `post-detail.spec.ts` |
| `/actions` | `actions.spec.ts` |
| `/announcements` | `announcements.spec.ts` |
| `/approvals` | `approvals.spec.ts` |
| `/attendance` | `attendance.spec.ts` |
| `/attendance/sync` | `attendance-sync.spec.ts` |
| `/attendance/unmatched` | `attendance-unmatched.spec.ts` |
| `/audit` | `audit.spec.ts` |
| `/education` | `education.spec.ts`, `education-crud.spec.ts`, `education-registration.spec.ts`, `education-mobile.spec.ts`, `quiz-questions.spec.ts`, `youtube.spec.ts` |
| `/monitoring` | `monitoring.spec.ts` |
| `/points` | `points.spec.ts` |
| `/points/policies` | `points-policies.spec.ts` |
| `/points/settlement` | `points-settlement.spec.ts` |
| `/recommendations` | `recommendations.spec.ts` |
| `/rewards` | `rewards.spec.ts` |
| `/settings` | `settings.spec.ts` |
| `/sync-errors` | `sync-errors.spec.ts` |
| `/votes` | `votes.spec.ts` |
| `/votes/new` | `votes.spec.ts` (navigates to `/votes/new`) |
| `/votes/[id]` | **⚠️ NEEDS VERIFICATION** |
| `/votes/[id]/candidates/new` | **⚠️ NEEDS VERIFICATION** |
| `/votes/candidates` | `votes.spec.ts` (navigates to `/votes/candidates`) |

### Worker App Pages (16 routes) → E2E Specs (16 files)
| Route | E2E Spec(s) |
|-------|-------------|
| `/` (root) | `smoke.spec.ts` |
| `/login` | `login.spec.ts`, `smoke.spec.ts` |
| `/register` | `register.spec.ts` |
| `/home` | `home.spec.ts` |
| `/posts` | `posts.spec.ts` |
| `/posts/new` | `posts.spec.ts` |
| `/posts/view` | `posts.spec.ts` |
| `/actions` | `actions.spec.ts` |
| `/actions/view` | `actions.spec.ts` (navigates via detail) |
| `/announcements` | `announcements.spec.ts` |
| `/education` | `education.spec.ts`, `youtube.spec.ts` |
| `/education/view` | `education.spec.ts`, `youtube.spec.ts` |
| `/education/quiz-take` | `quiz-take.spec.ts`, `education.spec.ts` |
| `/points` | `points.spec.ts` |
| `/profile` | `profile.spec.ts` |
| `/votes` | `votes.spec.ts` |

### API Routes (20 modules) → E2E Specs
All 20 API route modules have corresponding E2E spec files. Admin sub-routes covered via `admin-endpoints.spec.ts`.

### Potential Gaps Identified So Far
- Admin `/votes/[id]` (vote detail) — unclear if directly tested
- Admin `/votes/[id]/candidates/new` — unclear if directly tested
- API `/admin/scheduler` — no dedicated E2E spec found
- API admin sub-routes `distributions`, `alerting`, `access-policies`, `trends` — covered generically by `admin-endpoints.spec.ts` but may lack deep functional tests

## File Operations
### Read
- `/home/jclee/dev/safetywallet/playwright.config.ts`
- `/home/jclee/dev/safetywallet/e2e/` (directory listing)
- All 75 `*.spec.ts` files scanned via grep for test names and navigations

### Modified
- (none)
