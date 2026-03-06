# AGENTS: WORKER STORES

## PURPOSE

- Zustand state boundary for worker client runtime.
- Current scope is a single auth/session store.
- Guarantees hydration-aware route gating in static-export environments.

## FILES/STRUCTURE

- `auth.ts` - `useAuthStore`, `AuthState`, persistence setup, hydration flags.
- `__tests__/auth.test.ts` - store contract tests for login/logout/persist behavior.

## CONVENTIONS

- Persist key is `safetywallet-auth`.
- Persisted fields (`partialize`): `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `currentSiteId`.
- Runtime-only field: `_hasHydrated` (never persisted).
- Action surface: `setUser`, `setTokens`, `setCurrentSite`, `login`, `logout`.
- `logout` performs best-effort `POST /auth/logout` then clears client auth state.
- Hydration state is set from both `persist.onFinishHydration` and `persist.hasHydrated()`.
- Storage is browser-guarded via `createJSONStorage(() => localStorage)`.

## ANTI-PATTERNS

- Do not persist `_hasHydrated`.
- Do not move `logout` onto `apiFetch`; refresh recursion risk.
- Do not remove hydration completion callbacks.
- Do not expand this store with unrelated feature state.
- Do not bypass store actions by mutating auth state from outside `auth.ts`.
