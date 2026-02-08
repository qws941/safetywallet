# PACKAGES/TYPES

## OVERVIEW

Shared TypeScript types, 19 enums, and DTO interfaces consumed by all apps.

## STRUCTURE

```
src/
├── index.ts              # Barrel export (ALL types/enums/DTOs)
├── enums.ts              # 19 enum definitions
└── dto/
    ├── index.ts          # DTO barrel export
    ├── auth.dto.ts       # Auth request/response types
    ├── post.dto.ts       # Post CRUD types
    ├── user.dto.ts       # User types
    ├── site.dto.ts       # Site types
    ├── attendance.dto.ts # Attendance types
    ├── education.dto.ts  # Course, material, quiz types
    ├── vote.dto.ts       # Vote types
    ├── point.dto.ts      # Point types
    ├── announcement.dto.ts
    └── admin.dto.ts      # Admin dashboard types
```

## CONVENTIONS

- **Barrel exports**: Everything re-exported from `src/index.ts`
- **Import as**: `import { UserRole, CreatePostDto } from "@safetywallet/types"`
- **DTOs are interfaces** — no runtime validation (Zod is on API side)
- **Enums MUST match** Drizzle schema enums in `api-worker/src/db/schema.ts`

## ENUMS (19)

UserRole, ReviewStatus, ActionStatus, PostCategory, PostType, VoteStatus, PointType, AttendanceStatus, SiteStatus, MembershipStatus, AnnouncementType, NotificationType, ApprovalStatus, DisputeStatus, EducationContentType, QuizQuestionType, PolicyStatus, DeviceType, AuditAction

## ANTI-PATTERNS

- **Never add runtime logic** — types-only package
- **Never import from sub-paths** — always import from `@safetywallet/types`
- **Enum sync**: Adding/changing an enum HERE requires matching change in `api-worker/src/db/schema.ts`
