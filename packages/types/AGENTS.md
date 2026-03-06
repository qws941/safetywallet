# Types

## PURPOSE

- Runtime-free shared contracts package for apps and API.
- Canonical home for enums, DTO barrels, and typed i18n catalog exports.

## INVENTORY

- `src/index.ts` — root export surface (`enums`, `api`, `dto`, `i18n`).
- `src/enums.ts` — 24 shared enums consumed across apps/API.
- `src/api.ts` — transport envelopes (`ApiResponse`, `PaginatedResponse`, `ErrorResponse`).
- `src/dto/` — 13 files total: `AGENTS.md`, 11 domain DTO modules, `index.ts`.
- `src/i18n/` — 3 files total: `AGENTS.md`, `ko.ts`, `index.ts`.
- `src/__tests__/` — 5 contract tests (`enums`, `dto`, `dto-shapes`, `exports`, `i18n`).
- `src/` footprint — 22 TypeScript files in this package.
- `package.json` — package metadata, scripts, workspace wiring.
- `tsconfig.json` — package TS compiler contract.
- `vitest.config.ts` — unit test runtime config.

## CONVENTIONS

- Keep package side-effect free; types/interfaces/enums only.
- Route consumer imports through package root; avoid deep-path imports.
- DTO add/remove requires same-change update in `src/dto/index.ts`.
- Locale add/remove requires same-change update in `src/i18n/index.ts` and `src/index.ts`.
- Enum literal changes treated as API contract changes; coordinate callers.
- Preserve DTO nullability/optional semantics exactly.

## ANTI-PATTERNS

- Runtime helpers, fetchers, validators, or app state in this package.
- Duplicate enum unions when canonical enum already exists.
- Hidden exports bypassing `src/index.ts`.
- `any` or `unknown` widening in DTO contracts.

## DRIFT GUARDS

- Verify enum count and names against `src/enums.ts` before doc edits.
- Verify `src/dto/` and `src/i18n/` file counts from actual directory.
- Verify root barrel still exports all four contract domains.
- Verify tests still map to contract domains after file moves.
