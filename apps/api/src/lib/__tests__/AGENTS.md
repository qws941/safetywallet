# AGENTS: LIB TESTS

## PURPOSE

Unit tests for modules under `apps/api/src/lib`.
Covers utility contracts, adapter behavior, and envelope stability.

## FILES/STRUCTURE

- Test files in this directory: 23 (`*.test.ts`).
- Representative suites:
  - `fas-sync.test.ts` - FAS sync paths, collision scenarios, update/create counts.
  - `notification-queue.test.ts` - queue ack/retry/remove handling.
  - `web-push.test.ts` - push payload encryption and delivery classification.
  - `points-engine.test.ts` - scoring limits and duplicate windows.
  - `response.test.ts` - API envelope shape contract.
  - `state-machine.test.ts` - status transition guards.

## CURRENT FACTS

- Every main utility module has a corresponding test file here.
- Tests are pure vitest unit tests; no full Hono app bootstrapping in this directory.
- Common patterns include DB chain mocks, queue/push stubs, and logger mock assertions.

## CONVENTIONS

- Keep deterministic fixture values for timestamps, IDs, and hashes when asserting exact objects.
- Mock module boundaries (`vi.mock`) instead of private function internals.
- Assert both positive path and degraded path (retry, removal, fallback, partial failure).
- Reset mocks per suite (`beforeEach`) to avoid cross-file leakage.

## ANTI-PATTERNS

- Do not weaken `response.test.ts` envelope assertions; routes depend on exact shape.
- Do not share mutable singleton fixtures across multiple suites.
- Do not test route/middleware concerns in this directory.
- Do not skip failure-path assertions for queue, push, and sync utilities.
