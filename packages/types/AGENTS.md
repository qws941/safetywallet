# AGENTS: PACKAGES/TYPES

## SCOPE DELTA

- Owns package surface for `@safetywallet/types` only.
- Child docs own submodule details: `src/dto/AGENTS.md`, `src/i18n/AGENTS.md`.
- Keep this file aligned with real `src/` inventory.

## INVENTORY (CURRENT)

```text
src/
├── index.ts
├── api.ts
├── enums.ts
├── dto/ (12 files: 11 domain DTO files + index.ts)
├── i18n/ (2 files: index.ts, ko.ts)
└── __tests__/ (5 files)
```

## EXPORT SURFACE

- Root barrel re-exports: `./enums`, `./api`, `./dto`, `./i18n`.
- API envelope contracts: `ApiResponse<T>`, `PaginatedResponse<T>`, `ErrorResponse`.
- Enum source: `src/enums.ts` (24 enums; shared API/UI contract).
- DTO + i18n public access is barrel-first; avoid deep-import assumptions in docs.

## MODULE RULES

- Add/remove DTO file: update `src/dto/index.ts` in same commit.
- Add/remove i18n locale file: update `src/i18n/index.ts` and root barrel.
- Enum literal changes are breaking across API + apps; treat as contract migration.
- Keep package runtime-free: types/contracts/constants only.
- Keep strict TS compatibility for all workspaces consuming this package.

## TEST/VERIFY TOUCHPOINTS

- Existing tests in `src/__tests__/` validate enums, DTO shapes, i18n, exports.
- Run package tests when changing exports, enums, DTO shapes, or i18n keys.
- Keep `packages/types/vitest.config.ts` assumptions intact (no ad-hoc test entrypoints).

## ANTI-DRIFT

- No app-local duplicate DTO aliases.
- No silent enum value rewrite.
- No stale inventory/count text in this file.
- No package policy duplication from repo-root AGENTS.
