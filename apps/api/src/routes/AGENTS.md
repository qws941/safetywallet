# AGENTS: ROUTES

## PURPOSE

Non-admin API route layer mounted under `/api`.
This directory owns user/public feature routers and composes feature subrouters.

## FILE INVENTORY

| Group                   | Count | Files/dirs                                                                                                                                                                                       |
| ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Top-level route modules | 13    | `announcements.ts`, `approvals.ts`, `disputes.ts`, `fas.ts`, `images.ts`, `notifications.ts`, `points.ts`, `policies.ts`, `recommendations.ts`, `reviews.ts`, `sites.ts`, `users.ts`, `votes.ts` |
| Feature subdirectories  | 5     | `actions/`, `attendance/`, `auth/`, `education/`, `posts/`                                                                                                                                       |
| Admin subtree           | 1     | `admin/` (mounted separately at `/api/admin`)                                                                                                                                                    |
| Test subtree            | 1     | `__tests__/` (`AGENTS.md` + 19 integration suites)                                                                                                                                               |

## FEATURE SUBDIR SNAPSHOT

| Subdir        | Files                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `actions/`    | `crud-routes.ts`, `helpers.ts`, `image-routes.ts`, `index.ts`                                                                                          |
| `posts/`      | `crud-routes.ts`, `helpers.ts`, `index.ts`, `media-routes.ts`                                                                                          |
| `auth/`       | `index.ts`, `lockout.ts`, `login-admin.ts`, `login-worker.ts`, `login.ts`, `register.ts`, `session.ts`                                                 |
| `education/`  | `completions.ts`, `contents.ts`, `helpers.ts`, `index.ts`, `quiz-attempts.ts`, `quizzes.ts`, `statutory.ts`, `tbm.ts`, `__tests__/completions.test.ts` |
| `attendance/` | `index.ts`, `routes.ts`                                                                                                                                |

## CURRENT FACTS

- `src/index.ts` mounts 18 non-admin route modules from this layer.
- `actions/index.ts` enforces `authMiddleware` + `attendanceMiddleware` before CRUD/image handlers.
- `posts/index.ts` enforces `authMiddleware` then registers CRUD/media handlers.
- `/api/system/status` and `/api/fas-sync` stay in `src/index.ts` and are intentionally not defined here.

## CHILD AGENTS

- `admin/AGENTS.md`
- `__tests__/AGENTS.md`

## CONVENTIONS

- Keep feature boundaries intact; split files by domain behavior inside each subdir.
- Keep route-level validation colocated with handlers using shared validator modules.
- Use router composition (`route` or register helpers) instead of giant monolithic route files.

## ANTI-PATTERNS

- Do not put admin-only handlers in this directory.
- Do not duplicate entrypoint-only endpoints (`/system/status`, `/fas-sync`).
- Do not flatten `actions`, `posts`, `auth`, `education`, or `attendance` into one file.
