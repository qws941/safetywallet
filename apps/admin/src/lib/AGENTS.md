# Lib

## PURPOSE

- Own shared admin runtime utilities in `src/lib`.
- Keep API transport and low-level helpers centralized.

## FILE INVENTORY

- `api.ts` - `apiFetch`, `ApiError`, `API_BASE`, refresh mutex/retry flow.
- `utils.ts` - utility re-export boundary (`cn`).
- `__tests__/api.test.ts`, `__tests__/utils.test.ts`.

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

## ANTI-PATTERNS

- Re-implementing refresh/retry logic in hooks or components.
- Swallowing non-OK API responses instead of throwing typed `ApiError`.
- Introducing app-domain business rules into `src/lib` helpers.
