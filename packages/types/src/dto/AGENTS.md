# AGENTS: TYPES/DTO

## SCOPE DELTA

- Folder owns DTO contract files only.
- Parent (`packages/types/AGENTS.md`) owns package-wide rules.

## FILE INVENTORY (12)

- `index.ts`
- `action.dto.ts`
- `analytics.dto.ts`
- `announcement.dto.ts`
- `auth.dto.ts`
- `education.dto.ts`
- `points.dto.ts`
- `post.dto.ts`
- `review.dto.ts`
- `site.dto.ts`
- `user.dto.ts`
- `vote.dto.ts`

## DOMAIN MAP

- `action`: corrective actions + images + status transitions.
- `analytics`: trend + distribution response contracts.
- `announcement`: create/update/list/detail contracts.
- `auth`: OTP/login/token/me envelopes.
- `education`: content, quiz, statutory training, TBM records.
- `points`: award/revoke/balance/history contracts.
- `post`: create/list/detail/filter + media.
- `review`: review action/status contracts.
- `site`: site/member/dashboard contracts.
- `user`: user profile/update contracts.
- `vote`: candidate/vote/result/export contracts.

## BARREL RULES

- `index.ts` re-exports all 11 domain DTO files.
- Add/remove DTO file: update barrel in same change.
- Keep domain grouping order stable for low-noise diffs.

## EDIT GUARDRAILS

- Keep enum-backed fields imported from `../enums`.
- Preserve optional/null semantics already used by API payloads.
- Preserve nested list/detail object shapes consumed by apps/e2e.
- No fallback to `any` or untyped extension maps.

## ANTI-DRIFT

- No stale file count.
- No undocumented DTO file additions.
- No duplicate DTO ownership text from parent AGENTS.
