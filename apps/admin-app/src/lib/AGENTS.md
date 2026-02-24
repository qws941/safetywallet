# AGENTS: LIB

## PURPOSE

Admin-side network client and utility layer. Hooks and pages import from here — never raw `fetch`.

## KEY FILES

| File       | Lines | Role                                                  |
| ---------- | ----- | ----------------------------------------------------- |
| `api.ts`   | 82    | `apiFetch<T>()`, `ApiError`, `API_BASE`, refresh flow |
| `utils.ts` | 1     | Re-exports `cn` from `@safetywallet/ui`               |

## `apiFetch` CONTRACT

- Reads tokens from `useAuthStore.getState()` — no token param needed.
- Auto-attaches `Authorization: Bearer` header when token present.
- On 401 + refreshToken available: calls `/auth/refresh` → retries original request once.
- On refresh success: updates store via `setTokens()`.
- On refresh failure or second 401: calls `logout()` and throws `ApiError`.
- Always throws `ApiError(message, status, code)` on non-ok responses.

## CONVENTIONS

- Keep network behavior in `api.ts`; domain hooks call `apiFetch` instead of raw fetch.
- Keep `NEXT_PUBLIC_API_URL` as the single base URL source for admin API calls.
- Preserve refresh-token retry flow; do not add second retry.
- Keep `utils.ts` side-effect free and presentation-focused.

## ANTI-PATTERNS

- Do not add domain/business rules here; keep that in `src/hooks/*`.
- Do not swallow auth failures silently; throw `ApiError` with status/code.
- Do not duplicate token storage logic outside `src/stores/auth.ts`.
- Do not bypass `apiFetch` with raw `fetch` in hooks or pages.
