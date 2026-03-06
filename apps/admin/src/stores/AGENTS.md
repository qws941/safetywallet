# Stores

## PURPOSE

- Define runtime store contracts for admin client state.

## FILE INVENTORY

- Runtime store: `auth.ts`.
- Store tests: `__tests__/auth.test.ts`.
- Scope is intentionally narrow (single store module today).

## CONVENTIONS

- Store implementation uses Zustand persist and keeps key `safetywallet-admin-auth` stable.
- `auth.ts` owns all token/session state:
  - `user`
  - `tokens`
  - `currentSiteId`
  - `isAdmin`
  - `_hasHydrated`
- `login` derives admin role flags from auth payload.
- `logout` clears local auth state even if backend logout request fails.
- `setTokens` is the refresh/update path used by `apiFetch`.
- `_hasHydrated` gates startup flows for static-export client hydration.

## ANTI-PATTERNS

- Duplicating token/session state in hooks or route components.
- Removing `_hasHydrated` checks and causing pre-hydration API calls.
- Renaming persist key without explicit migration handling.
