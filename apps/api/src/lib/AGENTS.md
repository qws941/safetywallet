# AGENTS: LIB

## PURPOSE

Shared service and utility layer consumed by routes, middleware, durable objects, and scheduler jobs.
This directory owns reusable business logic and adapters, not route wiring.

## FILE INVENTORY

| Group                              | Count | Files                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top-level runtime modules (`*.ts`) | 25    | `alerting.ts`, `audit.ts`, `auto-issue.ts`, `crypto.ts`, `device-registrations.ts`, `face-blur.ts`, `fas-sync.ts`, `gcp-auth.ts`, `gemini-ai.ts`, `image-privacy.ts`, `jwt.ts`, `key-manager.ts`, `logger.ts`, `notification-queue.ts`, `observability.ts`, `phash.ts`, `points-engine.ts`, `rate-limit.ts`, `response.ts`, `session-cache.ts`, `sms.ts`, `state-machine.ts`, `sync-lock.ts`, `web-push.ts`, `workers-ai.ts` |
| Type shims                         | 2     | `piexifjs.d.ts`, `sql-js.d.ts`                                                                                                                                                                                                                                                                                                                                                                                               |
| Subdirectories                     | 3     | `fas/`, `fas-mariadb/`, `__tests__/`                                                                                                                                                                                                                                                                                                                                                                                         |

## SUBDIR SNAPSHOT

| Subdir         | Files                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fas/`         | `attendance-extra-queries.ts`, `attendance-helpers.ts`, `attendance-list-query.ts`, `attendance-ops.ts`, `attendance-queries.ts`, `connection.ts`, `employee-queries.ts`, `index.ts`, `mappers.ts`, `types.ts` |
| `fas-mariadb/` | `index.ts`                                                                                                                                                                                                     |

## CURRENT FACTS

- `notification-queue.ts` provides queue producer/consumer functions used by entrypoint queue handling.
- `fas-sync.ts` performs FAS-to-D1 synchronization and handles active/retired employee reconciliation.
- `rate-limit.ts` is library helper logic and is distinct from middleware wrapper behavior.
- `response.ts`, `logger.ts`, and `jwt.ts` are high fan-in modules used across route and middleware layers.

## CHILD AGENTS

- `__tests__/AGENTS.md`

## CONVENTIONS

- Keep side-effect boundaries clear: pure transforms separate from env/binding adapters.
- Preserve PII pipeline order: normalize -> hash/HMAC -> encrypt -> persist controlled fields.
- Keep response envelope helpers stable because route tests and clients depend on exact shape.
- Keep queue handling idempotent and explicit about retry/remove/fail-count outcomes.

## ANTI-PATTERNS

- Do not move route-specific auth/validation concerns into `src/lib`.
- Do not change queue message contracts without updating producers and consumers.
- Do not introduce circular imports from route internals back into shared library code.
- Do not silently broaden PII field handling in `fas-sync.ts`.
