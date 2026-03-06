# I18n

## PURPOSE

- Shared typed locale contract for package-level translations.
- Canonical key source used by app-level i18n runtime.

## INVENTORY

- `AGENTS.md` — local i18n contract notes.
- `ko.ts` — canonical Korean catalog exported `as const`.
- `index.ts` — registry (`i18n`) and exported key/value types.

## CONVENTIONS

- Keep key format flat: `section.key`.
- Keep section prefixes stable; append keys before creating new prefix groups.
- Keep `ko.ts` as baseline completeness source for typed keys.
- Keep `index.ts` as single registry/type export surface.
- Apply key rename/removal only with coordinated consumer updates.

## ANTI-PATTERNS

- Nested locale object trees.
- Duplicate keys with divergent meaning.
- App-local ad hoc keys not represented in this catalog.
- Untyped string indexing that bypasses exported key types.

## DRIFT GUARDS

- Confirm directory remains 3 files (2 TS + `AGENTS.md`).
- Confirm registry still exports `ko` and derived types from `index.ts`.
- Confirm parent `packages/types/AGENTS.md` i18n counts match.
- Confirm new keys preserve established section namespace shape.
