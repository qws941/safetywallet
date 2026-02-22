# AGENTS: LIB/**TESTS**

## OVERVIEW

Utility and integration-adapter tests for api-worker `src/lib` modules.

## WHERE TO LOOK

| Task                    | File Pattern                                 | Notes                                        |
| :---------------------- | :------------------------------------------- | :------------------------------------------- |
| FAS integration mapping | `fas-*.test.ts`                              | fallback queries, pagination, row mapping    |
| Security primitives     | `crypto.test.ts`, `jwt.test.ts`              | hash/sign/verify and token lifetime behavior |
| Alerting/notifications  | `alerting*.test.ts`, `web-push*.test.ts`     | payload integrity and retry-safe behavior    |
| Workflow/state guards   | `state-machine*.test.ts`, `response.test.ts` | transition validity and envelope consistency |

## CONVENTIONS

- Mock all external adapters (`mysql2`, queues, storage, third-party APIs) at module boundary.
- Use small fixture builders for rows/events to keep mapping assertions readable.
- Validate fallback ordering explicitly when module supports multi-source lookups.
- Assert log side-effects only when behaviorally meaningful; avoid snapshot noise.
- Keep tests deterministic with fixed timestamps/ids for crypto and pagination scenarios.

## ANTI-PATTERNS

- No real credentials, no live service calls.
- No broad catch-all assertions that miss field-level mapping regressions.
- No test-only behavior branches in production utility modules.

## NOTES

- This subtree is high-volume; keep each suite scoped to one lib module contract.
