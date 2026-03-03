# AGENTS: VALIDATORS

## PURPOSE

Central Zod schemas for API request validation.
Scope here is validator definitions only (no route handler logic).

## FILES/STRUCTURE

- Top-level validator files: 2
  - `fas-sync.ts`
  - `export.ts`
- Shared schema directory: `schemas/`
  - `auth.ts`
  - `domain.ts`
  - `shared.ts`
  - `index.ts` (barrel for auth/domain only)
- Tests: `__tests__/schemas.test.ts`, `__tests__/fas-sync.test.ts`, `__tests__/export.test.ts`

## CURRENT FACTS

- `fas-sync.ts` defines strict FAS timestamp format `YYYY-MM-DD HH:MM:SS` and attendance sync payload/response schemas.
- `fas-sync.ts` accepts `checkinAt` as ISO datetime or FAS timestamp format.
- `export.ts` defines post/user/attendance export query schemas with strict `YYYY-MM-DD` date checks.
- `export.ts` normalizes `page` from query string to integer with default fallback to `1`.
- `schemas/index.ts` intentionally re-exports only `auth` and `domain`; `shared.ts` stays internal.

## CONVENTIONS

- Keep reusable primitives and regexes in `schemas/shared.ts`.
- Keep schema names explicit with `*Schema` suffix and export inferred types for route typing.
- Keep strict bounds on external payloads (`min`, `max`, `regex`, `refine`) for sync and export inputs.
- Keep compatibility validations documented when multiple timestamp/date formats are accepted.

## ANTI-PATTERNS

- Do not add route-specific side effects in validator files.
- Do not loosen date/timestamp validation to accept ambiguous free-form strings.
- Do not export internal shared primitives from `schemas/index.ts` unless all imports are updated intentionally.
- Do not diverge enum constraints from DB/type-level enum values without coordinated changes.
