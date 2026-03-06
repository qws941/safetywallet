# Worker Hooks

Client hook layer for API, auth, i18n, and PWA behaviors.

## Purpose

- Centralize React Query usage and cache invalidation policy
- Hide fetch/store details behind stable hook interfaces
- Keep route/components thin and domain-focused

## Files (14 modules)

- `use-actions-api.ts` - corrective action queries/mutations
- `use-api-base.ts` - shared exports (`useQuery`, `useMutation`, `apiFetch`, DTO types)
- `use-api.ts` - barrel re-export surface (no logic)
- `use-attendance-api.ts` - attendance status/checkin hooks, polling behavior
- `use-auth.ts` - selector facade over `useAuthStore`
- `use-education-api.ts` - education list/detail/quiz hooks
- `use-install-prompt.ts` - install prompt lifecycle + dismissal behavior
- `use-leaderboard.ts` - ranking/leaderboard queries
- `use-locale.ts` - locale setter/getter adapter over i18n context
- `use-posts-api.ts` - posts list/detail/create/resubmit hooks
- `use-push-subscription.ts` - push subscription checks and registration
- `use-recommendations-api.ts` - recommendation fetch hooks
- `use-system-api.ts` - system banner/message hooks
- `use-translation.ts` - translator factory hook from `useI18n`

## Conventions

- Query keys use tuple form with domain prefixes (for example `["posts", siteId]`)
- Mutations explicitly invalidate related keys using `queryClient.invalidateQueries`
- Site/ID-dependent hooks keep `enabled` guards
- Offline-safe mutations pass `offlineQueue: true` to `apiFetch`
- `useAttendanceToday` uses 5-minute `staleTime` and `refetchInterval`
- `useAuth` stays a thin store adapter, not a second auth state source
- Locale persistence key is `i18n-locale` (`use-locale` and provider both sync it)
- Install prompt dismissal key is `safetywallet-install-dismissed`

## Anti-Patterns

- Do not duplicate domain API calls inside route/component files
- Do not flatten query keys into string constants
- Do not replace `apiFetch` with raw `fetch` in domain hooks
- Do not drop `enabled` gates for parameter-dependent queries
- Do not widen hook return types to `any`
