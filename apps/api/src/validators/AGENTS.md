# AGENTS: VALIDATORS

## PURPOSE

Central request validation schemas for API handlers.
This directory defines Zod contracts only; handler control flow belongs in routes/middleware.

## FILE INVENTORY

| Group                       | Count | Files                                                                                 |
| --------------------------- | ----- | ------------------------------------------------------------------------------------- |
| Top-level validator modules | 3     | `export.ts`, `fas-sync.ts`, `query.ts`                                                |
| Shared schema modules       | 4     | `schemas/auth.ts`, `schemas/domain.ts`, `schemas/index.ts`, `schemas/shared.ts`       |
| Tests                       | 3     | `__tests__/export.test.ts`, `__tests__/fas-sync.test.ts`, `__tests__/schemas.test.ts` |

## CURRENT FACTS

- `fas-sync.ts` enforces FAS timestamp format (`YYYY-MM-DD HH:MM:SS`) and supports compatibility parsing for attendance timestamps.
- `export.ts` validates export date boundaries and query defaults, including page normalization.
- `schemas/index.ts` intentionally re-exports only `auth` and `domain`; shared primitives remain internal.

## CONVENTIONS

- Keep reusable primitives and regexes in `schemas/shared.ts`.
- Keep schema names explicit and type exports aligned with route usage.
- Keep strict bounds (`min`, `max`, `regex`, `refine`) on externally supplied fields.
- Keep validator behavior deterministic and side-effect-free.

## ANTI-PATTERNS

- Do not add route/business side effects in validator modules.
- Do not relax date/time validation into ambiguous free-form parsing.
- Do not expose internal shared schema primitives without coordinated import updates.
- Do not let enum/value constraints drift from DB and route expectations.
