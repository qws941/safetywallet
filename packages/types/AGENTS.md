# AGENTS: PACKAGES/TYPES

## SCOPE DELTA

- Owns concrete type surface details for `@safetywallet/types`.
- Child docs own DTO-level and i18n-level rules.
- Keep this file inventory-accurate when files/exports change.

## SOURCE INVENTORY

```text
src/
├── index.ts
├── enums.ts
├── api.ts
├── dto/
│   ├── index.ts
│   ├── action.dto.ts
│   ├── analytics.dto.ts
│   ├── announcement.dto.ts
│   ├── auth.dto.ts
│   ├── education.dto.ts
│   ├── points.dto.ts
│   ├── post.dto.ts
│   ├── review.dto.ts
│   ├── site.dto.ts
│   ├── user.dto.ts
│   └── vote.dto.ts
└── i18n/
    ├── index.ts
    └── ko.ts
```

## EXPORT SURFACE (CURRENT)

- Root barrel: `export * from "./enums" | "./api" | "./dto" | "./i18n"`.
- API envelopes: `ApiResponse<T>`, `PaginatedResponse<T>`, `ErrorResponse`.
- Enum file currently declares 24 enums:
  `UserRole`, `MembershipStatus`, `Category`, `RiskLevel`, `Visibility`, `ReviewStatus`,
  `ActionStatus`, `ActionPriority`, `ReviewAction`, `TaskStatus`, `RejectReason`, `ApprovalStatus`,
  `EducationContentType`, `QuizStatus`, `StatutoryTrainingType`, `TrainingCompletionStatus`,
  `MembershipRole`, `AttendanceResult`, `AttendanceSource`, `VoteCandidateSource`,
  `DisputeStatus`, `DisputeType`, `SyncType`, `SyncErrorStatus`.

## CHANGE CHECKLIST

- Update `src/index.ts` on any new public symbol.
- Update `src/dto/index.ts` on DTO file adds/removes.
- Verify enum literal parity against API worker schema before rename.
- Keep response-envelope shape aligned with `success()/error()` helpers.

## PACKAGE-LEVEL ANTI-DRIFT

- No domain text/constants; only type contracts.
- No app-local aliases/types that duplicate DTOs.
- No silent enum value changes (breaks D1 + clients).
- No deep-import guidance drift in docs; barrel remains canonical.
