# Worker Components

Reusable component and guard/provider layer for worker screens.

## Purpose

- Provide shared route shell UI and cards/modals
- Enforce auth/attendance gating behavior in client runtime
- Centralize app provider composition in one entrypoint (`providers.tsx`)

## Files (13 components)

- `attendance-guard.tsx` - attendance gate wrapper with loading/fallback behavior
- `auth-guard.tsx` - auth redirect guard with public-path checks
- `bottom-nav.tsx` - bottom navigation and center post CTA
- `header.tsx` - page header with locale/system widgets
- `install-banner.tsx` - PWA install CTA with dismissal window
- `locale-switcher.tsx` - locale selector using i18n config
- `offline-queue-indicator.tsx` - queued request indicator + replay trigger
- `points-card.tsx` - points summary UI card
- `post-card.tsx` - post list card with status/urgent markers
- `providers.tsx` - authoritative provider stack for app root
- `ranking-card.tsx` - leaderboard ranking card UI
- `system-banner.tsx` - system severity banner UI
- `unsafe-warning-modal.tsx` - unsafe-condition modal dialog

## Conventions

- Provider order in `providers.tsx` is fixed:
  `QueryClientProvider -> I18nProvider -> AuthGuard -> children + OfflineQueueIndicator + Toaster + InstallBanner`
- `AuthGuard` public paths are strictly `/`, `/login`, `/login/*`
- `AuthGuard` clears React Query cache when hydrated and logged out
- `OfflineQueueIndicator` reflects `lib/api` queue length and replay state
- `InstallBanner` uses `safetywallet-install-dismissed` 7-day suppression
- `LocaleSwitcher` uses `i18n/config` locale source, not hardcoded options

## Anti-Patterns

- Do not perform raw API calls directly in components
- Do not widen public-route allowlist in `auth-guard.tsx` casually
- Do not remove query cache clear-on-logout behavior
- Do not inline locale constants in component files
- Do not remove offline queue state/listener behavior from indicators
