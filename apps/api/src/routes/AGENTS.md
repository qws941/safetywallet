# AGENTS: ROUTES

## PURPOSE

Core API route layer mounted under `/api`.
This directory contains public/user route modules and feature subrouters; admin subtree is separate.

## FILES/STRUCTURE

- Top-level route files: 13
  - `announcements.ts`, `approvals.ts`, `disputes.ts`, `fas.ts`, `images.ts`, `notifications.ts`, `points.ts`, `policies.ts`, `recommendations.ts`, `reviews.ts`, `sites.ts`, `users.ts`, `votes.ts`
- Feature subdirectories: `actions/`, `attendance/`, `auth/`, `education/`, `posts/`
- Admin subtree directory: `admin/` (mounted separately)
- Tests: `__tests__/` (core route tests)

## CURRENT FACTS

- `src/index.ts` mounts 18 route modules from this layer: `auth`, `attendance`, `votes`, `recommendations`, `posts`, `actions`, `users`, `sites`, `announcements`, `points`, `reviews`, `fas`, `disputes`, `policies`, `approvals`, `education`, `images`, `notifications`.
- `actions/index.ts` and `posts/index.ts` register internal CRUD/media subroutes after middleware.
- `auth/index.ts` composes register/login/password/session route modules.
- `/api/system/status` and `/api/fas-sync` are not defined here; they live in `src/index.ts`.

## CONVENTIONS

- Default pattern: build `new Hono<...>()`, attach middleware, export default router.
- Keep route-local validation near handlers via shared validators (`src/validators`).
- Keep auth/attendance requirements at handler or router level, not global in this directory.
- Preserve route group boundaries (`auth`, `posts`, `actions`, `education`, `attendance`) to avoid giant flat files.

## ANTI-PATTERNS

- Do not add admin-only endpoints to non-admin route modules.
- Do not duplicate scheduler/system endpoints in this directory.
- Do not assume one-file-per-feature; some features are intentionally split across subrouters.
- Do not reintroduce stale module names that do not exist in current tree.
