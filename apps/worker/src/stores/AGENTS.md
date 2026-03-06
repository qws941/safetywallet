# Worker Stores

## PURPOSE

- Zustand state contract for worker client runtime.
- Current scope: auth/session state only.

## INVENTORY

- `AGENTS.md` - stores-layer contract.
- `auth.ts` - `useAuthStore`, persist config, hydration flags, auth actions.
- `__tests__/auth.test.ts` - store behavior regression tests.

## CONVENTIONS

- Persist key remains `safetywallet-auth`.
- Persisted fields (`partialize`): `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `currentSiteId`.
- Runtime-only field `_hasHydrated` stays non-persisted.
- Action surface remains `setUser`, `setTokens`, `setCurrentSite`, `login`, `logout`.
- `logout` performs best-effort `POST /auth/logout` using direct `fetch`, then clears store.
- Hydration completion set through both `persist.onFinishHydration` and `persist.hasHydrated()` paths.
- Storage adapter stays browser-guarded via `createJSONStorage(() => localStorage)`.

## ANTI-PATTERNS

- No persistence of `_hasHydrated`.
- No `logout` migration to `apiFetch` (refresh recursion risk).
- No direct outside mutation of auth state bypassing store actions.
- No feature/domain state expansion into this store.
- No removal of hydration callbacks used by route guards.

## DRIFT GUARDS

- Verify persist key/partialized fields when auth payload shape changes.
- Verify route guards still rely on `_hasHydrated` contract.
- Verify logout still clears tokens/user/current site even if network fails.
- Keep store module count aligned: one runtime store + one test file.
- Recheck this file whenever new store modules are introduced under `src/stores`.
