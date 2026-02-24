# AGENTS: VALIDATORS

## PURPOSE

Zod schema source for route validation inputs and selected response contracts.
Shared by core routes and admin routes.

## KEY FILES

| File          | Scope                      | Current Facts                                                                                                  |
| ------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `schemas.ts`  | main API schemas           | Large schema registry: auth, posts, actions, disputes, votes, admin bodies, education, pagination primitives.  |
| `fas-sync.ts` | strict FAS payloads        | Defines FAS timestamp regex (`YYYY-MM-DD HH:MM:SS`), attendance sync event/body, sync result schema types.     |
| `export.ts`   | admin export query schemas | Defines users/posts/attendance export query validators with strict `YYYY-MM-DD` date checks and page coercion. |

## MODULE SNAPSHOT

- Runtime schema files: 3 (`schemas.ts`, `fas-sync.ts`, `export.ts`).
- Tests: `__tests__/schemas.test.ts`, `__tests__/fas-sync.test.ts`, `__tests__/export.test.ts`.

## PATTERNS

- Keep shared primitives near top of `schemas.ts` (`uuid`, month pattern, non-empty strings).
- Use named `*Schema` exports and paired inferred types where routes consume typed payloads.
- Tight input bounds on external-system payloads (`max`, `regex`, date-range guards).
- Export query schemas normalize page values to sane defaults.

## GOTCHAS/WARNINGS

- Enum lists in `schemas.ts` must stay aligned with DB/type package enums.
- `fas-sync.ts` accepts both ISO datetime and FAS timestamp for attendance events; maintain compatibility.
- `export.ts` date validators intentionally reject non-`YYYY-MM-DD` query forms.
