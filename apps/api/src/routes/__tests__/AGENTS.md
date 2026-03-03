# AGENTS: ROUTE TESTS

## PURPOSE

Vitest coverage for non-admin API route behavior.
Focuses on request validation, auth/permission outcomes, and response contracts.

## FILES/STRUCTURE

- Test files in this directory: 19
  - `actions.test.ts`, `announcements.test.ts`, `approvals.test.ts`, `attendance.test.ts`, `auth.test.ts`, `disputes.test.ts`, `education.test.ts`, `fas.test.ts`, `images.test.ts`, `notifications.test.ts`, `points.test.ts`, `policies.test.ts`, `posts.test.ts`, `recommendations.test.ts`, `reviews.test.ts`, `sites.test.ts`, `system-status.test.ts`, `users.test.ts`, `votes.test.ts`
- Admin route tests are separate in `src/routes/admin/__tests__/`.

## CURRENT FACTS

- `system-status.test.ts` validates endpoint behavior implemented in `src/index.ts`, not in route module files.
- Most suites construct small Hono app fixtures and mock DB/bindings per test file.
- Route tests assert status and JSON envelope together, not status-only.

## CONVENTIONS

- Keep one domain-focused test file per route module.
- Mock external boundaries (`drizzle`, queue, KV, middleware) with explicit fixture wiring.
- Cover rejection paths for auth, validation, and permission checks in each suite where applicable.
- Keep request payloads deterministic to avoid flaky timestamp or UUID comparisons.

## ANTI-PATTERNS

- Do not place admin route assertions in this directory.
- Do not weaken response-body contract checks to only assert HTTP code.
- Do not share mutable global mocks across route suites.
- Do not add tests for endpoints that live outside route modules without naming that explicitly (as done for `system-status`).
