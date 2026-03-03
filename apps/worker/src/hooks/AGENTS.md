# AGENTS: WORKER HOOKS

## PURPOSE

- Client hook layer for API access, auth/i18n adapters, PWA behaviors.
- Centralizes React Query usage and cache invalidation rules.
- Exposes stable hooks to pages/components; hides fetch/store internals.

## FILES/STRUCTURE

- Hook modules (14):
  - `use-actions-api.ts`
  - `use-api-base.ts`
  - `use-api.ts` (barrel only)
  - `use-attendance-api.ts`
  - `use-auth.ts`
  - `use-education-api.ts`
  - `use-install-prompt.ts`
  - `use-leaderboard.ts`
  - `use-locale.ts`
  - `use-posts-api.ts`
  - `use-push-subscription.ts`
  - `use-recommendations-api.ts`
  - `use-system-api.ts`
  - `use-translation.ts`
- Tests under `hooks/__tests__/` for core behavior and regressions.

## CONVENTIONS

- `use-api.ts` re-exports domain hooks; no logic in barrel.
- Query keys are tuple-style and domain-prefixed (`["posts", siteId]`, `["recommendations", ...]`).
- Mutations invalidate related domain keys explicitly (`actions`, `posts`, `recommendations`, `quiz-attempts`).
- Offline-safe mutations set `offlineQueue: true` where recovery is supported.
- `useAttendanceToday` polls every 5 minutes (`staleTime` + `refetchInterval`).
- `useAuth` is thin selector facade over `useAuthStore`.
- `useLocale` and `I18nProvider` both persist `i18n-locale`.
- `usePushSubscription` requires authenticated state before initial subscription check.
- `useInstallPrompt` stores dismissal timestamp at `safetywallet-install-dismissed`.

## ANTI-PATTERNS

- Do not add API calls directly in pages when an equivalent hook exists.
- Do not collapse tuple query keys to strings; invalidation precision degrades.
- Do not remove `enabled` guards on site/ID-dependent hooks.
- Do not replace `apiFetch` with raw `fetch` in domain API hooks.
- Do not return untyped `any` from new hook payloads; keep DTO/shape explicit.
