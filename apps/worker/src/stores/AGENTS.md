# AGENTS: WORKER STORES

## PURPOSE

- Zustand state boundary for worker app.
- Current scope: single auth/session store only.
- Guarantees hydration-aware auth gating in static-export runtime.

## FILES/STRUCTURE

- `auth.ts`: `useAuthStore` + `AuthState` + persistence/hydration wiring.
- `__tests__/auth.test.ts`: auth store behavior and persistence coverage.

## CONVENTIONS

- Persist key: `safetywallet-auth`.
- Persisted fields (`partialize`):
  - `user`
  - `accessToken`
  - `refreshToken`
  - `isAuthenticated`
  - `currentSiteId`
- Runtime-only field: `_hasHydrated` (not persisted).
- Action surface: `setUser`, `setTokens`, `setCurrentSite`, `login`, `logout`.
- `logout` sends best-effort `/auth/logout` then clears local auth/session state.
- Hydration flags set by both `persist.onFinishHydration` and `persist.hasHydrated()`.
- Storage setup is browser-guarded (`createJSONStorage` only when `window` exists).

## ANTI-PATTERNS

- Do not persist `_hasHydrated`; it must remain runtime-only.
- Do not switch `logout` to `apiFetch`; avoids refresh recursion during token teardown.
- Do not remove hydration callbacks; route guards depend on them.
- Do not add unrelated feature state to auth store; keep it narrowly scoped.
