# AGENTS: DB

## PURPOSE

Database contract layer for the API worker runtime.
Owns Drizzle table/enum/relation definitions and D1 batch helper behavior.

## FILE INVENTORY

| File                        | Role                                                   |
| --------------------------- | ------------------------------------------------------ |
| `schema.ts`                 | Canonical Drizzle schema and relation definitions      |
| `helpers.ts`                | Batch execution wrappers (`dbBatch`, `dbBatchChunked`) |
| `__tests__/schema.test.ts`  | Schema contract coverage                               |
| `__tests__/helpers.test.ts` | Batch helper behavior coverage                         |

## CURRENT FACTS

- `schema.ts` currently contains 34 `sqliteTable(...)` declarations.
- Domain groups remain identity/access, safety lifecycle, points/voting, attendance/sync, and education.
- `helpers.ts` keeps chunked-write fallback with `D1_BATCH_LIMIT = 100`.

## CONVENTIONS

- Keep related table, index, and relation declarations adjacent in `schema.ts`.
- Keep enum constraints aligned with validator and route expectations.
- Use chunked batch helpers when mutation volume may exceed D1 per-batch constraints.
- Apply additive schema evolution and retire compatibility fields through migrations.

## ANTI-PATTERNS

- Do not split table definitions across unrelated runtime layers.
- Do not update documented table counts without checking source declarations.
- Do not run oversized unchunked `db.batch` operations in high-volume paths.
- Do not remove enum/column compatibility paths before migration rollout.
