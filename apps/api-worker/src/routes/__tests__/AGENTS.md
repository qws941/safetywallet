# AGENTS: ROUTES/**TESTS**

## OVERVIEW

Route-level Vitest suites for Hono handlers, validation paths, and response contracts.

## WHERE TO LOOK

| Task                     | File Pattern                                     | Notes                                    |
| :----------------------- | :----------------------------------------------- | :--------------------------------------- |
| Auth/login behavior      | `auth.test.ts`                                   | session token and lock/limit behaviors   |
| Content/post lifecycle   | `posts*.test.ts`, `reviews.test.ts`              | status transitions and permission checks |
| Attendance/approval flow | `attendance*.test.ts`, `manual-approval.test.ts` | gatekeeping and fallback paths           |
| Worker/admin APIs        | `admin-*.test.ts`, `votes*.test.ts`              | privileged routes and policy checks      |

## CONVENTIONS

- Build test app with shared test helper (`createApp`/factory) instead of duplicating Hono bootstrap.
- Mock middleware, validators, and DB chains deterministically; keep external I/O disabled.
- Assert standardized response envelope (`success/error`) and status codes together.
- Keep Korean/domain labels as fixture values when endpoint behavior depends on localized enums.
- Cover both happy path and authorization/validation failure path in the same suite.

## ANTI-PATTERNS

- No live network/database access in route tests.
- No implicit dependency on test order or global mutable state.
- No broad `any`-typed fixtures that hide schema drift.

## NOTES

- Prefer focused route suites over large integration blobs; route coverage already broad in this subtree.
