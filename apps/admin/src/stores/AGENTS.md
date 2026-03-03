# AGENTS: STORES

## SCOPE

- Admin Zustand store layer (`src/stores`).
- Current runtime store surface: `auth.ts` only.

## FILES

- `auth.ts` - persisted auth/session/site-context store.
- `__tests__/auth.test.ts` - store contract tests.

## STATE CONTRACT (`auth.ts`)

- `user: User | null`.
- `tokens: Tokens | null` (access + refresh).
- `currentSiteId: string | null`.
- `isAdmin: boolean`.
- `_hasHydrated: boolean` (persist hydration readiness flag).

## ACTION CONTRACT

- `login(user, tokens)`:
  - sets user + tokens.
  - derives `isAdmin` from role (`SITE_ADMIN`/`SUPER_ADMIN`).
- `logout()`:
  - clears auth state.
  - best-effort logout POST to `${API_BASE}/auth/logout` when refresh token exists.
  - network failure is non-fatal.
- `setTokens(tokens)`:
  - updates token pair after refresh/login transitions.
- `setSiteId(siteId)`:
  - updates active site context consumed by site-scoped hooks.

## HYDRATION BEHAVIOR

- Uses Zustand persist with hydration callback.
- `_hasHydrated` is explicit gate for app bootstrap logic.
- Static-export client hydration relies on this signal; do not remove.

## CONSTRAINTS

- Keep token lifecycle centralized here; no duplicate token state in hooks/components.
- Keep logout resilient: clear local auth state even when backend logout call fails.
- New stores should be documented here only after runtime adoption.

## TEST NOTES

- `auth.test.ts` validates login/logout, token updates, site switching, hydration handling.
- Store tests should remain fast, isolated, no network dependency.
