# AGENTS: STORES

## PURPOSE

State layer for admin auth/session. Scope: single persisted Zustand store in `auth.ts`.

## KEY FILES

| File                     | Role               | Notes                                                    |
| ------------------------ | ------------------ | -------------------------------------------------------- |
| `auth.ts`                | auth/session store | user, tokens, `currentSiteId`, `isAdmin`, hydration flag |
| `__tests__/auth.test.ts` | store tests        | login/logout, hydration, token/site updates              |

## STORE SHAPE

| Field           | Type             | Notes                                 |
| --------------- | ---------------- | ------------------------------------- |
| `user`          | `User \| null`   | minimal user snapshot with role       |
| `tokens`        | `Tokens \| null` | access + refresh tokens               |
| `currentSiteId` | `string \| null` | active site context                   |
| `isAdmin`       | `boolean`        | computed at `login` from role         |
| `_hasHydrated`  | `boolean`        | persistence hydration completion gate |

## ACTIONS

| Action                | Behavior             | Side effects                                                         |
| --------------------- | -------------------- | -------------------------------------------------------------------- |
| `login(user, tokens)` | sets auth state      | computes `isAdmin` for `SITE_ADMIN`/`SUPER_ADMIN`                    |
| `logout()`            | clears auth fields   | best-effort POST `${API_BASE}/auth/logout` when refresh token exists |
| `setTokens(tokens)`   | token refresh/update | no extra side effects                                                |
| `setSiteId(siteId)`   | site context switch  | drives site-scoped hooks                                             |

## GOTCHAS

- Hydration callback uses `persist.onFinishHydration`; required due static-export hydration behavior.
- `_hasHydrated` is manually set when persist already hydrated; do not remove bootstrap guard.
- `logout()` intentionally swallows network failures.

## PARENT DELTA

- Parent admin doc only points to store location.
- This file documents exact state contract and lifecycle side-effects.
