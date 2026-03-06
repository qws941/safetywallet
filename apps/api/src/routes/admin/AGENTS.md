# AGENTS: ROUTES ADMIN

## PURPOSE

Admin API layer mounted at `/api/admin`.
Owns operational endpoints for export, monitoring, sync errors, moderation, policy/access control, and admin analytics.

## FILE INVENTORY

| Group                  | Count | Files/dirs                                                                                                                                                                                                                                                                            |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top-level route files  | 18    | `access-policies.ts`, `alerting.ts`, `attendance.ts`, `audit.ts`, `distributions.ts`, `education.ts`, `export.ts`, `helpers.ts`, `images.ts`, `index.ts`, `issues.ts`, `monitoring.ts`, `recommendations.ts`, `settlements.ts`, `stats.ts`, `sync-errors.ts`, `trends.ts`, `votes.ts` |
| Feature subdirectories | 3     | `fas/`, `posts/`, `users/`                                                                                                                                                                                                                                                            |
| Integration tests      | 20    | `__tests__/` contains 20 `*.test.ts` files                                                                                                                                                                                                                                            |

## SUBDIR SNAPSHOT

| Subdir   | Files                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| `fas/`   | `helpers.ts`, `hyperdrive-routes.ts`, `index.ts`, `query-routes.ts`, `sync-workers-routes.ts`, `types.ts` |
| `posts/` | `delete-handlers.ts`, `index.ts`, `list-routes.ts`, `moderation-routes.ts`, `review-handlers.ts`          |
| `users/` | `index.ts`, `routes.ts`                                                                                   |

## CURRENT FACTS

- `index.ts` applies `authMiddleware` globally, then mounts 19 admin apps (`users`, `export`, `fas`, `posts`, and 15 top-level domain routers).
- `alerting.ts` owns maintenance-message endpoints; `maintenance.test.ts` validates that behavior via alerting routes.
- `export.ts` relies on admin helpers and export validators for guarded data extraction flows.

## CONVENTIONS

- Keep shared admin query/response helpers centralized in `helpers.ts`.
- Preserve global auth gate in `index.ts`; per-endpoint permission checks are additive.
- Keep sync error status transitions explicit and auditable in `sync-errors.ts`.
- Keep monitoring/statistical read models scoped to admin routes.

## ANTI-PATTERNS

- Do not bypass `authMiddleware` for any new admin route mount.
- Do not duplicate shared helper logic inside `fas/`, `posts/`, or `users/`.
- Do not create a standalone `maintenance.ts`; alerting owns that surface.
- Do not diverge mounted route paths from module responsibility names.
