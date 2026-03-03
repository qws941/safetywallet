# AGENTS: DB

## PURPOSE

Database contract for API worker runtime.
Owns table definitions, relations, enums, and batch-write helpers.

## FILES/STRUCTURE

- `schema.ts` - full Drizzle schema catalog.
- `helpers.ts` - D1 batch execution helpers.
- `__tests__/schema.test.ts` and `__tests__/helpers.test.ts` validate schema and batching semantics.

## CURRENT FACTS

- `schema.ts` currently defines 32 `sqliteTable(...)` tables.
- Primary domain groups in file:
  - identity/access: `users`, `sites`, `siteMemberships`, `accessPolicies`, `manualApprovals`, `joinCodeHistory`, `deviceRegistrations`
  - safety lifecycle: `posts`, `postImages`, `reviews`, `actions`, `actionImages`, `disputes`, `auditLogs`, `announcements`
  - points/votes: `pointsLedger`, `pointPolicies`, `votes`, `voteCandidates`, `votePeriods`, `recommendations`
  - attendance/sync: `attendance`, `syncErrors`, `apiMetrics`, `pushSubscriptions`
  - education: `educationContents`, `quizzes`, `quizQuestions`, `quizAttempts`, `statutoryTrainings`, `tbmRecords`, `tbmAttendees`
- `helpers.ts` exposes `dbBatch` and `dbBatchChunked`; chunk limit constant is `D1_BATCH_LIMIT = 100`.

## CONVENTIONS

- Keep table, indexes, and relation declarations close together in `schema.ts`.
- Keep enum values in sync with route validators and shared type usage.
- Use `dbBatchChunked` for large mutation sets; inspect returned failed chunk metadata when partial success is unacceptable.
- Prefer additive schema changes; leave compatibility columns/enums until migrations remove them.

## ANTI-PATTERNS

- Do not scatter table definitions across unrelated files.
- Do not bump table count in docs without verifying `sqliteTable(...)` usage in source.
- Do not use single huge `db.batch` calls that can exceed D1 operation limits.
- Do not remove deprecated enum values unless all route and migration paths are updated.
