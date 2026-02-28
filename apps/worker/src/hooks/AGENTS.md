# AGENTS: HOOKS

## PURPOSE

Worker data-access and state-adapter hooks.
Defines query keys, mutation invalidation, auth/i18n convenience adapters.

## KEY FILES

| File                             | Exports                         | Scope                                                                                                 |
| -------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `hooks/use-api.ts`               | 27 hooks                        | System status, posts, profile, points, announcements, education, attendance, actions, recommendations |
| `hooks/use-auth.ts`              | `useAuth()`                     | Store adapter for user/auth/site/hydration/actions                                                    |
| `hooks/use-leaderboard.ts`       | `useLeaderboard(siteId, type?)` | Points ranking query (`monthly` or `cumulative`)                                                      |
| `hooks/use-locale.ts`            | `useLocale()`                   | I18n context adapter + locale persistence                                                             |
| `hooks/use-push-subscription.ts` | `usePushSubscription()`         | SW push subscribe/unsubscribe state machine                                                           |
| `hooks/use-translation.ts`       | `useTranslation()`              | Typed translator factory from i18n messages                                                           |

## PATTERNS

- Query keys use tuple style, eg `['posts', siteId]`, `['actions', actionId]`.
- Mutation hooks invalidate narrow keys, eg `['actions', actionId]` after image upload/delete.
- Recommendation hooks in `use-api.ts`: `useTodayRecommendation`, `useRecommendationHistory`, `useSubmitRecommendation`.
- `useAttendanceToday(siteId)` polling: stale/refetch each 5 minutes.
- `useMyActions(params?)` builds URLSearchParams; key includes full `params` object.
- `usePushSubscription()` returns `{ isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe }`.

## GOTCHAS

- `use-api.ts` recommendation result types use `unknown`; consumers must narrow safely.
- `useLocale()` and i18n context both persist `i18n-locale`.
- `usePushSubscription()` requires authenticated state before checking existing subscription.
- `usePushSubscription()` message strings hardcoded Korean, not translation keys.
- `useLeaderboard()` expects endpoint payload nested in `res.data`.
- Some pages still use direct React Query with `apiFetch` (not hook wrappers), especially `app/votes/page.tsx`.
