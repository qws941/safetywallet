# Lib

## PURPOSE

- Own shared admin runtime utilities in `src/lib`.
- Keep API transport and low-level helpers centralized.

## INVENTORY

- Root files (`3` files, `2` TS):
  - `api.ts`
  - `utils.ts`
  - `AGENTS.md`
- Subdirs (`1`):
  - `__tests__/`
- Test files:
  - `__tests__/api.test.ts`
  - `__tests__/utils.test.ts`

## CONVENTIONS

- All authenticated API calls go through `apiFetch`.
- `apiFetch` reads auth state via `useAuthStore.getState()`.
- 401 handling contract:
  - attempt refresh when refresh token exists
  - serialize refresh attempts with mutex-like guard
  - update tokens via store on success
  - retry original request once
  - logout and throw `ApiError` on failure
- API base resolves from `NEXT_PUBLIC_API_URL` with `/api` fallback.
- Library files stay domain-agnostic and side-effect constrained.
- `utils.ts` stays a thin utility boundary; no network/auth coupling.

## ANTI-PATTERNS

- Re-implementing refresh/retry logic in hooks or components.
- Swallowing non-OK API responses instead of throwing typed `ApiError`.
- Introducing app-domain business rules into `src/lib` helpers.
- Reading React state directly inside `src/lib` except store getter contract in `api.ts`.

## DRIFT GUARDS

- On transport behavior changes, update `__tests__/api.test.ts` in same commit.
- On utility additions, keep `utils.ts` focused and documented here.
- Keep file counts accurate (`3` root files, `1` subdir).
- Verify 401 refresh path still follows single-refresh mutex behavior.
