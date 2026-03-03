# AGENTS: ROUTES ADMIN

## PURPOSE

Admin API layer mounted at `/api/admin`.
Owns moderation, monitoring, export, sync-error triage, policy/settlement controls.

## FILES/STRUCTURE

- Top-level route files in this directory: 16
  - `access-policies.ts`, `alerting.ts`, `attendance.ts`, `audit.ts`, `distributions.ts`, `export.ts`, `helpers.ts`, `images.ts`, `index.ts`, `monitoring.ts`, `recommendations.ts`, `settlements.ts`, `stats.ts`, `sync-errors.ts`, `trends.ts`, `votes.ts`
- Feature subdirectories: `fas/`, `posts/`, `users/`
- Tests: `__tests__/` (19 admin test files)

## CURRENT FACTS

- `index.ts` applies `authMiddleware` globally, then mounts 17 subrouters.
- Mounted modules include subdir routers (`users`, `fas`, `posts`) plus the 14 top-level feature routers.
- `alerting.ts` includes maintenance message endpoints; there is no separate `maintenance.ts` route file.
- `export.ts` uses export query validators and export-specific guards/rate-limit helpers from admin helper layer.

## CONVENTIONS

- Keep cross-admin helpers in `helpers.ts` and consume from all admin modules.
- Keep export endpoints protected by both role/permission checks and export rate limiting.
- Keep monitoring endpoints centered on `apiMetrics` aggregation logic.
- Keep sync error transitions explicit (`OPEN` -> `RESOLVED` or `IGNORED`) in sync-error handlers.

## ANTI-PATTERNS

- Do not bypass `authMiddleware` in `index.ts` for new admin routes.
- Do not duplicate helper logic inside `posts/`, `fas/`, or `users/` subrouters when it exists in `helpers.ts`.
- Do not create root-level admin handlers for domains already owned by subdirectories.
- Do not drift endpoint naming between `index.ts` mounts and feature router paths.
