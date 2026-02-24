# AGENTS: ROUTES/TESTS

## PURPOSE

Vitest suites for core route handler behavior.
Focus: validation, authorization, response contracts, route-level branching.

## KEY FILES

| File                    | Focus                     | Current Facts                                                             |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------- |
| `auth.test.ts`          | login/session behavior    | Heavy mocked DB and middleware chains; local `createApp` factory pattern. |
| `posts.test.ts`         | report lifecycle          | Covers CRUD/list pagination/error branches with mocked auth context.      |
| `notifications.test.ts` | push endpoints            | Subscription + send endpoint contract checks.                             |
| `attendance.test.ts`    | attendance route behavior | FAS event and attendance record cases.                                    |
| `system-status.test.ts` | outage banner contract    | Rebuilds `/api/system/status` response shape using KV mock.               |

## MODULE SNAPSHOT

- 19 test files (`src/routes/__tests__/*.test.ts`).
- This subtree targets core routes only; admin tests live in `routes/admin/__tests__/`.
- Most suites build per-file Hono test app factories (`createApp` or `buildApp`).

## PATTERNS

- Mock middleware and external adapters at import boundary (`vi.mock`).
- Keep request/response assertions explicit: status + body contract together.
- Validate both happy path and rejection path (auth/permission/validation).
- Use deterministic env fixture objects for DB/KV/queue bindings.

## GOTCHAS/WARNINGS

- No `manual-approval.test.ts` in this directory; stale references removed.
- `system-status.test.ts` intentionally mirrors endpoint logic from `src/index.ts`.
- Avoid sharing mock state between suites; each file resets with `beforeEach`.
