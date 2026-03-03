# AGENTS: LIB

## PURPOSE

Shared domain/service utilities used by routes, middleware, durable objects, and jobs.
Contains business helpers, adapter clients, and cross-cutting utilities.

## FILES/STRUCTURE

- Top-level runtime `.ts` files: 22.
- Local type shims: `piexifjs.d.ts`, `sql-js.d.ts`.
- Subdirectories:
  - `fas/` - FAS adapter functions/config.
  - `fas-mariadb/` - MariaDB connector internals.
  - `__tests__/` - per-module unit tests.
- High-impact modules:
  - `fas-sync.ts` - FAS -> D1 sync, PII hash/encrypt flow, collision-safe upsert logic.
  - `notification-queue.ts` - queue enqueue + batch processor.
  - `web-push.ts` - push encryption and delivery primitives.
  - `response.ts` - canonical JSON envelope helpers.

## CURRENT FACTS

- `notification-queue.ts` exports `enqueueNotification` and `processNotificationBatch`.
- `fas-sync.ts` exports `socialNoToDob`, `syncSingleFasEmployee`, `syncFasEmployeesToD1`, `deactivateRetiredEmployees`.
- `rate-limit.ts` here is library-side helper logic (distinct from middleware wrapper file).
- `logger.ts` and `observability.ts` are the shared logging/telemetry surface consumed by multiple modules.

## CONVENTIONS

- Keep side-effect-free helpers separated from binding-dependent adapter code.
- PII transforms remain ordered: normalize -> `hmac` -> `encrypt` -> persist hash/ciphertext pair.
- Keep response helper schema stable for route tests and client parsers.
- Keep queue processing idempotent per message and classify failures as retry/remove/increment-failcount.

## ANTI-PATTERNS

- Do not move route-specific validation or auth logic into this directory.
- Do not alter `fas-sync.ts` to overwrite app-managed user role/permission fields.
- Do not change `notification-queue.ts` message shape without updating producer and consumer call sites.
- Do not introduce circular imports from `src/lib` back into route module internals.
