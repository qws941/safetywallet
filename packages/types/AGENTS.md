# Types

Shared type contracts for `@safetywallet/types` (runtime-free package).

## Snapshot

- Most-imported shared package across apps (historical baseline: 152 import sites; current grep in `apps/`: 170 import statements).
- `src/` currently contains 22 TypeScript files total (root contracts + `dto/` + `i18n/` + tests).

## Inventory

- `src/index.ts` — package barrel exporting `./enums`, `./api`, `./dto`, `./i18n`.
- `src/enums.ts` — 24 cross-app enums:
  `UserRole`, `UserStatus`, `PostType`, `PostState`, `ActionStatus`, `ActionType`, `PointsTransactionType`, `VoteStatus`, `AnnouncementStatus`, `ContentType`, `QuizStatus`, `AttemptStatus`, `TrainingType`, `TbmStatus`, `EducationCategory`, `ReviewStatus`, `ReviewResult`, `SiteRole`, `MemberStatus`, `NotificationType`, `ApiErrorCode`, `SortOrder`, `DateRange`, `PointsPolicyType`.
- `src/api.ts` — envelope types: `ApiResponse<T>`, `PaginatedResponse<T>`, `ErrorResponse`.
- `src/dto/` — 12 files (11 domain DTO modules + `index.ts` barrel).
- `src/i18n/` — 2 files (`ko.ts`, `index.ts`) for typed locale catalogs.
- `src/__tests__/` — 5 tests (`enums`, `dto`, `dto-shapes`, `exports`, `i18n`).

## Conventions

- Keep this package pure contracts only (no runtime services, fetchers, or app logic).
- Consumers import from package root; avoid deep imports that bypass barrel surfaces.
- DTO file add/remove requires matching update to `src/dto/index.ts`.
- Locale add/remove requires matching update to `src/i18n/index.ts` and `src/index.ts`.
- Enum value changes are API contract changes; ship with migration notes and coordinated app updates.
- Keep `api.ts` transport envelopes stable to avoid broad caller churn.

## Drift Guards

- No app-local duplicate DTO aliases when shared DTO already exists here.
- No silent enum literal rewrites or reordering with behavior impact.
- No hidden exports that skip `src/index.ts`.
