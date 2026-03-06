# Worker Hooks

## PURPOSE

- Client hook boundary for query/mutation orchestration and domain API access.
- Keep components/pages free of transport/cache/store wiring.

## INVENTORY

- `AGENTS.md` - hooks-layer contract.
- `use-api-base.ts` - shared React Query + `apiFetch` + DTO exports.
- `use-api.ts` - barrel export entry.
- `use-auth.ts` - auth-store selector facade.
- `use-actions-api.ts` - actions domain hooks.
- `use-attendance-api.ts` - attendance domain hooks.
- `use-education-api.ts` - education domain hooks.
- `use-posts-api.ts` - posts list/detail/create/resubmit hooks.
- `use-recommendations-api.ts` - recommendations hooks.
- `use-system-api.ts` - system status/banner hooks.
- `use-leaderboard.ts` - leaderboard hooks.
- `use-push-subscription.ts` - push registration/permission hooks.
- `use-install-prompt.ts` - install prompt lifecycle hooks.
- `use-locale.ts` - locale selector hook.
- `use-translation.ts` - translation helper hook.
- `__tests__/` - hook contract tests.

## CONVENTIONS

- Query keys use tuple arrays with domain prefixes.
- Parameter-dependent queries keep `enabled` guards.
- Mutations invalidate or clear related keys via `queryClient` APIs.
- Offline-safe mutations pass `offlineQueue: true` into `apiFetch`.
- `useAttendanceToday` keeps 5-minute `staleTime` + `refetchInterval`.
- `useAuth` remains adapter-only; source of truth stays in Zustand store.
- Locale persistence key stays `i18n-locale`.
- Install prompt dismissal key stays `safetywallet-install-dismissed`.

## ANTI-PATTERNS

- No raw `fetch` in domain hooks when `apiFetch` fits.
- No string-flattened cache keys for domain queries.
- No dropping `enabled` guards for null/empty IDs.
- No hook return `any` expansion.
- No route/component-level duplication of domain hook logic.

## DRIFT GUARDS

- Recount top-level hook modules when adding/removing files.
- Verify query keys remain stable across hooks sharing invalidation boundaries.
- Verify offline queue usage remains only where operation is replay-safe.
- Verify `use-api.ts` barrel keeps parity with exported hook modules.
- Keep hook docs scoped to hook behavior; lib/store internals stay in sibling AGENTS files.
