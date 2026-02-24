# AGENTS: LIB

## PURPOSE

Domain utility layer for route handlers and scheduled jobs.
Owns crypto, external adapters, queue processing, shared domain logic.

## KEY FILES

| File                    | Role                         | Current Facts                                                                                                          |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `crypto.ts`             | PII and password primitives  | `hmac`, AES-GCM `encrypt/decrypt`, PBKDF2 `hashPassword/verifyPassword`. Versioned cipher format `v{N}:...` supported. |
| `fas-sync.ts`           | FAS->D1 sync engine          | Exports `syncSingleFasEmployee`, `syncFasEmployeesToD1`, `deactivateRetiredEmployees`, `socialNoToDob`.                |
| `web-push.ts`           | Push protocol implementation | VAPID JWT, RFC8291 payload encryption, bulk send helpers, retry/removal classifiers.                                   |
| `notification-queue.ts` | Queue consumer               | Exports `enqueueNotification`, `processNotificationBatch`; handles ack/retry and stale subscription deletion.          |
| `points-engine.ts`      | Point calculation policy     | Duplicate window 24h, daily post limit 3, daily point limit 30, false-report multiplier 2x.                            |
| `rate-limit.ts`         | DO client + fallback limiter | Uses `RATE_LIMITER` DO; in-memory fallback with 5-minute cleanup when DO unavailable.                                  |
| `state-machine.ts`      | Review/action transitions    | Transition validators return `{ valid, newReviewStatus?, newActionStatus?, error? }`.                                  |
| `response.ts`           | JSON envelope helpers        | Canonical `success(c,data,status)` and `error(c,code,message,status)`.                                                 |

## MODULE SNAPSHOT

- Directory has 24 runtime `.ts` files + 2 local `.d.ts` shims + `__tests__/`.
- Heavy adapters: `fas-mariadb.ts`, `web-push.ts`, `alerting.ts`.
- Shared infra helpers: `logger.ts`, `session-cache.ts`, `sync-lock.ts`, `observability.ts`.

## PATTERNS

- PII write path: normalize -> `hmac` hash -> `encrypt` ciphertext -> store hash + encrypted value.
- FAS sync path: upsert by external key, protect against PII-hash collision, batch mutating ops via `dbBatchChunked`.
- Push path: classify per-subscription result (`success`, retryable, remove) then update `pushSubscriptions` fail counters.
- Rate-limit path: prefer DO RPC; degrade to bounded in-memory counters instead of hard failure.

## GOTCHAS/WARNINGS

- `response.ts` envelope must remain stable; tests assert exact shape.
- `rate-limit.ts` fallback state is process-local only; not cross-instance.
- `fas-sync.ts` intentionally preserves app-side role/permission fields while syncing FAS fields.
- `web-push.ts` handles cryptography directly; avoid casual refactors without full test rerun.
