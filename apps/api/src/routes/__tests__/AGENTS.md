# AGENTS: ROUTE TESTS

## PURPOSE

Vitest integration coverage for non-admin route behavior under `/api`.
Focus: auth/permission gates, request validation, and response envelope contracts.

## FILE INVENTORY

| Type                     | Count | Files                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route integration suites | 19    | `actions.test.ts`, `announcements.test.ts`, `approvals.test.ts`, `attendance.test.ts`, `auth.test.ts`, `disputes.test.ts`, `education.test.ts`, `fas.test.ts`, `images.test.ts`, `notifications.test.ts`, `points.test.ts`, `policies.test.ts`, `posts.test.ts`, `recommendations.test.ts`, `reviews.test.ts`, `sites.test.ts`, `system-status.test.ts`, `users.test.ts`, `votes.test.ts` |
| Local docs               | 1     | `AGENTS.md`                                                                                                                                                                                                                                                                                                                                                                               |

## CURRENT FACTS

- `system-status.test.ts` verifies endpoint behavior implemented in `src/index.ts`, not a route module file.
- Admin assertions live in `src/routes/admin/__tests__/` and are intentionally separated.
- Suites validate both HTTP status and envelope payload shape.

## CONVENTIONS

- Keep one suite per route domain to mirror production route ownership.
- Use isolated mocks for `DB`, `KV`, queue, and middleware boundaries in each suite.
- Assert failure paths (401/403/422-class cases) alongside success paths for protected routes.
- Keep fixtures deterministic for timestamps, IDs, and locale-sensitive fields.

## ANTI-PATTERNS

- Do not mix admin route tests into this directory.
- Do not reduce assertions to status-only checks.
- Do not share mutable global mocks across files.
- Do not add entrypoint-only endpoint tests without explicit naming/context.
