# AGENTS: LIB

## SCOPE

- Admin library utilities in `src/lib`.
- Network client boundary and lightweight helper exports.

## FILES

- `api.ts` - admin API client (`apiFetch`, `ApiError`, `API_BASE`, auth-refresh flow).
- `utils.ts` - utility re-export boundary (`cn` from `@safetywallet/ui`).
- `__tests__/` - API utility tests.

## `apiFetch` RUNTIME CONTRACT

- Reads auth tokens from `useAuthStore.getState()`.
- Adds `Authorization: Bearer` when access token exists.
- On `401` with refresh token:
  - calls `/auth/refresh`.
  - updates store via `setTokens()` on success.
  - retries original request once.
- On refresh failure or repeated unauthorized response:
  - triggers `logout()`.
  - throws `ApiError`.
- Non-OK responses always throw `ApiError(message, status, code?)`.

## CONFIG FACTS

- API base source: `NEXT_PUBLIC_API_URL`.
- Fallback base in admin app config: `/api`.
- Admin app is static-exported; runtime API target must stay browser-safe.

## USAGE RULES

- Hooks/pages use `apiFetch`; avoid ad-hoc raw `fetch` for authenticated API calls.
- Keep auth/session side effects in store + `api.ts`, not in domain hooks.
- Keep utility exports side-effect free.

## ALLOWED EXCEPTIONS

- Direct `fetch` is acceptable for explicit non-standard flows (example: blob/CSV download helper in vote hook) when documented in hook module.

## ANTI-PATTERNS

- Duplicating refresh-token logic inside hooks.
- Swallowing API failures without error propagation.
- Embedding domain-specific business rules into `src/lib/api.ts`.
