# AGENTS: LIB TESTS

## PURPOSE

Unit-test layer for `apps/api/src/lib` modules.
Covers helper contracts, adapter behavior, retry/failure paths, and response envelope stability.

## FILE INVENTORY

| Type             | Count | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit test suites | 24    | `alerting.test.ts`, `audit.test.ts`, `auto-issue.test.ts`, `crypto.test.ts`, `device-registrations.test.ts`, `face-blur.test.ts`, `fas-mariadb.test.ts`, `fas-sync.test.ts`, `image-privacy.test.ts`, `jwt.test.ts`, `key-manager.test.ts`, `logger.test.ts`, `notification-queue.test.ts`, `observability.test.ts`, `phash.test.ts`, `points-engine.test.ts`, `rate-limit.test.ts`, `response.test.ts`, `session-cache.test.ts`, `sms.test.ts`, `state-machine.test.ts`, `sync-lock.test.ts`, `web-push.test.ts`, `workers-ai.test.ts` |
| Local docs       | 1     | `AGENTS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## CURRENT FACTS

- Tests here are module-level Vitest suites, not full Hono integration tests.
- Queue, push, sync, and lock behaviors are validated through controlled mock boundaries.
- `response.test.ts` acts as a contract guard for the API envelope helpers.

## CONVENTIONS

- Keep fixtures deterministic for timestamps, IDs, hashes, and ordering-sensitive arrays.
- Mock external boundaries (`DB`, queue, crypto, fetch/network) rather than private internals.
- Cover both success and degraded/error flows for high-impact modules.
- Reset and isolate mocks per suite to prevent cross-suite leakage.

## ANTI-PATTERNS

- Do not weaken response envelope assertions to partial checks.
- Do not place route or middleware integration concerns in this directory.
- Do not skip retry/remove/failure-path assertions for async orchestration modules.
- Do not rely on mutable shared singletons across test files.
