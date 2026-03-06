# AGENTS: DB

## PURPOSE

Drizzle schema and D1 helper contract layer.
Owns table/relations definitions and batch helper behavior.

## INVENTORY

- `schema.ts` - canonical table/index/relation definitions.
- `helpers.ts` - `dbBatch` and `dbBatchChunked` wrappers for D1 limits.
- `__tests__/schema.test.ts` - schema contract tests.
- `__tests__/helpers.test.ts` - batch helper tests.

## CONVENTIONS

- Keep table declaration, indexes, and relations adjacent per model block.
- Keep enum value changes synchronized with validators and route handlers.
- Keep bulk mutation paths routed through chunked helper when batch risk exists.
- Keep schema evolution additive; deprecations via explicit migrations.

## ANTI-PATTERNS

- Do not split schema ownership into route/lib modules.
- Do not hardcode stale table counts without reading `schema.ts`.
- Do not bypass chunking for large write batches.
- Do not remove compatibility columns before migration rollout state is complete.

## DRIFT GUARDS

- Check `schema.ts` for `sqliteTable(` count changes before doc updates.
- Check `helpers.ts` constants/signatures when D1 limits or call sites change.
- Check both db test files still map to `schema.ts` and `helpers.ts` ownership.
- Check migration additions are reflected in schema assumptions.
