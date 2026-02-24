# AGENTS: ROUTES/ADMIN

## PURPOSE

Admin API subtree mounted at `/api/admin`.
Owns operational dashboards, exports, moderation, sync error handling, alert controls.

## KEY FILES

| File             | Role                         | Current Facts                                                                                          |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `index.ts`       | admin router entry           | Applies `app.use("*", authMiddleware)` then mounts all admin sub-routers.                              |
| `helpers.ts`     | shared admin helpers         | Exports `AppContext`, day-cutoff constants, CSV builders, role/export guards, export limiter.          |
| `export.ts`      | CSV endpoints                | Supports users/posts/attendance CSV; uses validator schemas, `requireExportAccess`, `exportRateLimit`. |
| `monitoring.ts`  | API metrics views            | Reads aggregated `apiMetrics` for metrics, top-errors, summary endpoints.                              |
| `alerting.ts`    | alert + maintenance controls | Alert config/test endpoints plus maintenance message CRUD in KV.                                       |
| `sync-errors.ts` | sync error triage            | Filter/list sync errors, patch status to `RESOLVED` or `IGNORED`.                                      |

## MODULE SNAPSHOT

- Runtime modules in this directory: 17 (`*.ts` including `index.ts` and `helpers.ts`).
- Route modules mounted by `index.ts`: 15.
- Admin tests in sibling `__tests__/`: 17 files.

## PATTERNS

- `index.ts` owns global auth middleware; child modules usually add `requireAdmin` guard per endpoint.
- Shared helper imports come from `./helpers` to keep role/date/csv logic consistent.
- CSV export path: parse query schema -> fetch rows -> `buildCsv` -> `csvResponse`.
- Monitoring endpoints aggregate by bucket/endpoint over `apiMetrics` table.

## GOTCHAS/WARNINGS

- Maintenance endpoints live in `alerting.ts`; no standalone `maintenance.ts` route module.
- Keep `exportRateLimit` attached to export endpoints; high-cost route protection.
- `requireExportAccess` currently reads `users.canManageUsers` as export permission flag.
