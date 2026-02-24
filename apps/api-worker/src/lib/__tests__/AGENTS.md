# AGENTS: LIB/TESTS

## PURPOSE

Vitest suites for `src/lib` contracts.
Focus: pure helper behavior, adapter failure handling, envelope stability.

## KEY FILES

| File                         | Coverage Focus         | Current Facts                                                                |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `fas-sync.test.ts`           | FAS->D1 sync engine    | Largest suite; heavy DB chain mocks; verifies collision and upsert branches. |
| `web-push.test.ts`           | Push crypto/send paths | Validates payload encryption and subscription result classification.         |
| `notification-queue.test.ts` | Queue batch processor  | Verifies ack/retry/remove behavior for mixed delivery outcomes.              |
| `points-engine.test.ts`      | Reward policy logic    | Covers duplicate window, daily caps, role/condition branches.                |
| `response.test.ts`           | API envelope helper    | Asserts exact `{ success, data/error, timestamp }` shape.                    |
| `state-machine.test.ts`      | Transition validator   | Ensures invalid transitions return structured failure state.                 |

## MODULE SNAPSHOT

- 23 files: `*.test.ts` under this directory.
- One suite per lib module pattern; no integration bootstrap app here.
- Common mocks: `drizzle` chains, external adapters, logger side effects.

## PATTERNS

- Build lightweight factory helpers per suite (`makeDb`, `makeEmployee`, similar).
- Mock module boundary, not internals of function under test.
- Use deterministic IDs/timestamps for crypto and sync assertions.
- Assert both success path and degraded path (retry/fallback/error classification).

## GOTCHAS/WARNINGS

- `response.test.ts` is contract sentinel for API envelope shape.
- `fas-sync.test.ts` uses queued mock responses; sequence changes break expectations.
- Avoid cross-suite shared mutable state; each suite resets mocks in `beforeEach`.
