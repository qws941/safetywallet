# AGENTS: WORKER COMPONENTS

## PURPOSE

- Reusable UI/guard/provider layer for worker pages.
- Owns route shell parts, status banners, cards, modal wrappers.
- Keeps network/state access delegated to hooks/lib/stores.

## FILES/STRUCTURE

- Component files (13):
  - `attendance-guard.tsx`
  - `auth-guard.tsx`
  - `bottom-nav.tsx`
  - `header.tsx`
  - `install-banner.tsx`
  - `locale-switcher.tsx`
  - `offline-queue-indicator.tsx`
  - `points-card.tsx`
  - `post-card.tsx`
  - `providers.tsx`
  - `ranking-card.tsx`
  - `system-banner.tsx`
  - `unsafe-warning-modal.tsx`
- Tests under `components/__tests__/` mirror component names.

## CONVENTIONS

- Provider composition in `providers.tsx` is authoritative for app-wide wrappers.
- `AuthGuard` public path rule: `/`, `/login`, `/login/*` only.
- `AuthGuard` clears React Query cache on logged-out hydrated state.
- `AttendanceGuard` is attendance gate (`useAttendanceToday`) with loading and fallback modes.
- `Header` renders attendance chip + `LocaleSwitcher` + `SystemBanner`.
- `BottomNav` center CTA is `/posts/new`; center label intentionally empty.
- `OfflineQueueIndicator` polls queue length and supports manual replay.
- `SystemBanner` severity map: `critical | warning | info`.
- `PostCard` enum badge mapping includes review/action statuses and urgent marker.

## ANTI-PATTERNS

- Do not call API directly from components unless hook abstraction is intentionally absent.
- Do not widen public-route allowlist in `AuthGuard` without matching auth policy changes.
- Do not remove query cache clear on logout; stale cross-session data leaks.
- Do not hardcode locale list in `LocaleSwitcher`; consume `i18n/config` exports.
- Do not remove queue indicator/storage listeners; offline replay visibility is required.
