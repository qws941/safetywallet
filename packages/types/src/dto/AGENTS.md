# DTO

## PURPOSE

- Domain DTO contract layer under `@safetywallet/types`.
- Single DTO module split by feature domain; no runtime logic.

## INVENTORY

- `AGENTS.md` — local DTO documentation contract.
- `index.ts` — DTO barrel re-exporting all domain modules.
- `action.dto.ts` — action create/detail/list/update payloads.
- `analytics.dto.ts` — dashboard trend and distribution payloads.
- `announcement.dto.ts` — announcement CRUD/list payloads.
- `auth.dto.ts` — login/session/refresh/register payloads.
- `education.dto.ts` — education content/quiz/attempt/statutory/TBM payloads.
- `points.dto.ts` — ledger/history/balance/policy payloads.
- `post.dto.ts` — post list/detail/create/filter/media payloads.
- `review.dto.ts` — moderation review commands/results payloads.
- `site.dto.ts` — site/member/admin dashboard payloads.
- `user.dto.ts` — user profile and profile update payloads.
- `vote.dto.ts` — vote period/candidate/result/export payloads.

## CONVENTIONS

- Keep each domain in its matching `*.dto.ts` file.
- Import shared enums from `../enums` for enum-backed fields.
- Keep optional (`?`) vs nullable (`| null`) semantics exact.
- Add/remove DTO files only with synchronized `index.ts` export updates.
- Prefer explicit interface/type names with domain prefix.

## ANTI-PATTERNS

- Cross-domain dumping into unrelated DTO module.
- Inline enum string unions duplicating canonical enums.
- Contract widening via `any`, broad `Record<string, unknown>`, or cast escapes.
- Dead DTO exports not referenced by API/apps/tests.

## DRIFT GUARDS

- Confirm directory still has 13 files (12 TypeScript + `AGENTS.md`).
- Confirm barrel exports every domain module exactly once.
- Confirm new DTO fields preserve backward compatibility expectations.
- Confirm parent `packages/types/AGENTS.md` counts stay aligned.
