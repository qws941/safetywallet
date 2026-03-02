# AGENTS: DB

## PURPOSE

Single-source DB contract for api-worker runtime.
Only two runtime files: schema catalog + D1 batching helper.

## KEY FILES

| File         | Role                | Current Facts                                                                    |
| ------------ | ------------------- | -------------------------------------------------------------------------------- |
| `schema.ts`  | Full Drizzle schema | 1565 lines. 32 `sqliteTable(...)` exports. Enums + relations colocated.          |
| `helpers.ts` | D1 batch helpers    | `dbBatch<T>()`, `dbBatchChunked()`; chunk limit constant `D1_BATCH_LIMIT = 100`. |

## TABLE GROUPS (32)

- **Identity/access:** `users`, `sites`, `siteMemberships`, `accessPolicies`, `manualApprovals`, `joinCodeHistory`, `deviceRegistrations`.
- **Safety lifecycle:** `posts`, `postImages`, `reviews`, `actions`, `actionImages`, `disputes`, `auditLogs`, `announcements`.
- **Points/vote/recommendation:** `pointsLedger`, `pointPolicies`, `votes`, `voteCandidates`, `votePeriods`, `recommendations`.
- **Attendance/sync:** `attendance`, `syncErrors`, `apiMetrics`, `pushSubscriptions`.
- **Education:** `educationContents`, `quizzes`, `quizQuestions`, `quizAttempts`, `statutoryTrainings`, `tbmRecords`, `tbmAttendees`.

## PATTERNS

- Table + indexes + relations added in same file section; no split schema fragments.
- Date-only fields intentionally stored as epoch integer in several tables (`votePeriods`, `statutoryTrainings`, `tbmRecords`).
- `syncErrors` + `apiMetrics` support admin monitoring/alerting flows.
- `helpers.ts` throws only when all chunks fail; partial chunk failure returned via `BatchChunkedResult`.

## GOTCHAS/WARNINGS

- Existing comment still says "33 tables" in legacy docs; actual `sqliteTable` count is 32.
- `taskStatusEnum` remains in file but marked deprecated; prefer `actionStatusEnum`.
- `dbBatchChunked()` logs failures and continues; callers must inspect `failedChunks` when partial success unacceptable.
