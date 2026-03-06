# AGENTS: ROUTES

## PURPOSE

Non-admin route modules under `src/routes`.
Owns feature routers and feature-subdir composition.

## INVENTORY

- Top-level route modules (13): `announcements.ts`, `approvals.ts`, `disputes.ts`, `fas.ts`, `images.ts`, `notifications.ts`, `points.ts`, `policies.ts`, `recommendations.ts`, `reviews.ts`, `sites.ts`, `users.ts`, `votes.ts`.
- Feature subdirs (5): `actions/`, `attendance/`, `auth/`, `education/`, `posts/`.
- `actions/` files (4): `crud-routes.ts`, `helpers.ts`, `image-routes.ts`, `index.ts`.
- `attendance/` files (2): `index.ts`, `routes.ts`.
- `auth/` files (7): `index.ts`, `lockout.ts`, `login-admin.ts`, `login-worker.ts`, `login.ts`, `register.ts`, `session.ts`.
- `education/` files (8 + test subdir): `completions.ts`, `contents.ts`, `helpers.ts`, `index.ts`, `quiz-attempts.ts`, `quizzes.ts`, `statutory.ts`, `tbm.ts`, `__tests__/`.
- `posts/` files (4): `crud-routes.ts`, `helpers.ts`, `index.ts`, `media-routes.ts`.
- Child modules: `admin/` and `__tests__/` each with dedicated `AGENTS.md`.

## CONVENTIONS

- Keep feature route registration inside each feature `index.ts`; keep top-level files domain-scoped.
- Keep middleware order explicit when feature index composes guarded subroutes.
- Keep handler helpers colocated (`helpers.ts`) with route family that consumes them.
- Keep route path contracts stable across feature refactors.

## ANTI-PATTERNS

- Do not add admin-only handlers in this directory.
- Do not move entrypoint-only endpoints into feature route files.
- Do not collapse subdir families (`actions`, `auth`, `education`, `posts`) into single mega files.
- Do not duplicate path registration across feature index and top-level mount files.

## DRIFT GUARDS

- Check `src/index.ts` route mounts against top-level route file list.
- Check each feature subdir file list before updating inventory bullets.
- Check `admin/` and `__tests__/` remain documented as child-owned modules.
- Check new route files for matching tests in `src/routes/__tests__/` naming.
