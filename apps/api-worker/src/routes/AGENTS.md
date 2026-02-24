# AGENTS: ROUTES

## PURPOSE

Core API route modules mounted under `/api`.
Admin subtree is separate (`/api/admin`) and documented in child AGENT.

## KEY FILES

| File               | Domain           | Current Facts                                                                |
| ------------------ | ---------------- | ---------------------------------------------------------------------------- |
| `auth.ts`          | account/session  | login/register/refresh/me; uses auth rate limiter.                           |
| `posts.ts`         | safety reports   | attendance-gated create/list/detail/update flows; image hash fields handled. |
| `education.ts`     | training content | largest module; courses/quizzes/TBM/statutory endpoints.                     |
| `attendance.ts`    | attendance APIs  | user attendance reads + FAS sync event ingestion path.                       |
| `fas.ts`           | FAS worker sync  | FAS-facing worker sync and worker removal endpoints.                         |
| `votes.ts`         | monthly voting   | candidate listing/current period/cast vote/history.                          |
| `notifications.ts` | push delivery    | subscription CRUD + send endpoints; integrates with web-push helpers.        |

## MODULE SNAPSHOT

- Top-level route modules: 18 (`src/routes/*.ts`).
- Mounted from `src/index.ts` under `/api/{name}`.
- Current set: `auth`, `attendance`, `votes`, `recommendations`, `posts`, `actions`, `users`, `sites`, `announcements`, `points`, `reviews`, `fas`, `disputes`, `policies`, `approvals`, `education`, `images`, `notifications`.

## PATTERNS

- Module structure: `const app = new Hono<...>()` then exported default router.
- Handler-level middleware invocation is default pattern (`auth`, `attendance`, `rate-limit` as needed).
- Request validation uses `zValidator` + schemas from `src/validators`.
- Mutating operations usually emit audit log entries via shared audit helpers.

## GOTCHAS/WARNINGS

- No `acetime.ts` module in this directory; stale references should stay removed.
- `/api/system/status` and `/api/fas-sync` are in `src/index.ts`, not in route modules here.
- Admin routes are mounted via `src/routes/admin/index.ts`; do not duplicate admin concerns in this layer.
