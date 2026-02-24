# AGENTS: STORES

## PURPOSE

Single persisted client auth store.
Owns user/session/site state and hydration readiness for static export.

## KEY FILES

| File                            | Symbol         | Responsibility                                                          |
| ------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `stores/auth.ts`                | `useAuthStore` | Zustand store for user, tokens, auth flag, current site, hydration flag |
| `stores/auth.ts`                | `AuthState`    | Contract for state + actions                                            |
| `stores/__tests__/auth.test.ts` | tests          | Persistence and action behavior coverage                                |

## PATTERNS

- Persist middleware key: `safetywallet-auth`.
- Persisted subset (`partialize`): `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `currentSiteId`.
- Non-persisted runtime field: `_hasHydrated`.
- Action set: `setUser`, `setTokens`, `setCurrentSite`, `login`, `logout`.
- `logout` behavior: best-effort POST `/auth/logout`, then clear local auth state.
- Hydration sync: `persist.onFinishHydration` + `persist.hasHydrated()` both set `_hasHydrated = true`.

## GOTCHAS

- `logout` uses direct `fetch`, not `apiFetch`; intentionally avoids refresh recursion.
- `login` does not set `currentSiteId`; caller must set site separately.
- Store `User` type allows nullable `nameMasked`, optional `companyName`, optional `tradeType`.
- SSR guard in persist storage setup: `createJSONStorage` only when `window` exists.
- UI redirect logic depends on `_hasHydrated`; removing hydration hooks causes flicker/redirect loops.
