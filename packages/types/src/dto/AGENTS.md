# DTO

Domain DTO contracts shared by API and app clients.

## Inventory (12 files)

- `index.ts` — barrel that re-exports all domain DTO modules.
- `action.dto.ts` — action create/read/update status/image payload contracts.
- `analytics.dto.ts` — trend and points-distribution chart DTOs.
- `announcement.dto.ts` — announcement create/update/list payload contracts.
- `auth.dto.ts` — OTP, token refresh, session payload, and registration DTOs.
- `education.dto.ts` — education content/quiz/attempt/statutory/TBM DTO families.
- `points.dto.ts` — points ledger/history/balance and policy mutation DTOs.
- `post.dto.ts` — post create/list/detail/filter and media DTOs.
- `review.dto.ts` — moderation review action/result DTOs.
- `site.dto.ts` — site/member management and dashboard stats DTOs.
- `user.dto.ts` — user profile and profile update DTOs.
- `vote.dto.ts` — vote candidate/result/summary/export DTOs.

## Contract Rules

- Enum-backed fields must import enums from `../enums`; do not inline string unions that duplicate canonical enums.
- File add/remove in this directory must be mirrored in `index.ts` within the same change.
- Preserve API nullability and optional semantics exactly (`?` vs nullable union).
- Prefer explicit interface names over generic `Payload` naming.
- Keep domain module boundaries stable (`post.*` DTOs stay in `post.dto.ts`, etc.).

## Drift Guards

- No `any`, `unknown` escape hatches, or loose record maps for API contracts.
- No nested object copies of enum literals when enum type already exists.
- No cross-domain DTO dumping into unrelated files.
- No export-only dead DTOs that are not consumed by API or apps.
