# Stores

## PURPOSE

- Contract for client-side state modules under `src/stores`.
- Keep auth state boundaries explicit and test-backed.

## INVENTORY

- Root files (`2` files, `1` TS):
  - `auth.ts`
  - `AGENTS.md`
- Subdirs (`1`):
  - `__tests__/`
- Test file:
  - `__tests__/auth.test.ts`

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
- Keep store API minimal; add actions only when consumed by multiple modules.

## ANTI-PATTERNS

- Duplicating token/session state in hooks or route components.
- Removing `_hasHydrated` checks and causing pre-hydration API calls.
- Renaming persist key without explicit migration handling.
- Adding domain-specific UI flags to auth store.

## DRIFT GUARDS

- On any new store module, add it to `INVENTORY` with owner scope.
- On auth shape changes, update `__tests__/auth.test.ts` in same commit.
- Keep direct file counts accurate for this folder.
- Re-check persisted key string before merge.
