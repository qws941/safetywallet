# Worker Components

## PURPOSE

- Shared UI, guard, and provider composition boundary for worker routes.
- Keep route pages thin by centralizing reusable client presentation/guard logic.

## INVENTORY

- `AGENTS.md` - components-layer contract.
- `providers.tsx` - root provider composition + QueryClient defaults.
- `auth-guard.tsx` - public/protected route gate + post-logout query cache clear.
- `attendance-guard.tsx` - attendance prerequisite guard wrapper.
- `offline-queue-indicator.tsx` - queued request count + manual replay action.
- `install-banner.tsx` - install CTA + local dismissal policy.
- `locale-switcher.tsx` - locale chooser bound to i18n config/context.
- `header.tsx` - common route header.
- `bottom-nav.tsx` - bottom navigation shell.
- `post-card.tsx` - post list card.
- `points-card.tsx` - points summary card.
- `ranking-card.tsx` - ranking card.
- `system-banner.tsx` - system state banner.
- `unsafe-warning-modal.tsx` - unsafe-condition dialog.
- `__tests__/` - component and guard contract tests.

## CONVENTIONS

- Provider order remains: `QueryClientProvider -> I18nProvider -> AuthGuard -> children + OfflineQueueIndicator + Toaster + InstallBanner`.
- Query defaults in `providers.tsx`: `staleTime` 2m, `retry` 1, `refetchOnWindowFocus` false.
- Auth public-path allowlist in `auth-guard.tsx`: `/`, `/login`, `/login/*`.
- Logout flow in guard clears query cache to avoid stale cross-session UI.
- Offline indicator polls queue length and listens to `online/offline/storage` events.
- Install banner key remains `safetywallet-install-dismissed` with 7-day suppression window.
- Locale options come from i18n config/context; no component-local locale registries.

## ANTI-PATTERNS

- No direct API transport calls inside presentational components.
- No widening of `AuthGuard` public-path rules without auth-flow review.
- No removal of query-cache clear on logout.
- No hardcoded locale option lists inside component files.
- No disabling offline queue listeners/polling without replacement visibility path.

## DRIFT GUARDS

- Recheck provider order on any provider insertion/removal.
- Recheck `AuthGuard` path normalization logic when adding auth-related routes.
- Verify queue indicator still reflects `getOfflineQueueLength()` and replay action.
- Verify install prompt dismissal key/TTL stays aligned with hook implementation.
- Recount component modules/tests whenever files are added or retired.
