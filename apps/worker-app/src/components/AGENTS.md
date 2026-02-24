# AGENTS: COMPONENTS

## PURPOSE

Reusable UI and guard layer for app pages.
Owns provider composition, nav/header shell, domain cards, modal wrappers.

## KEY FILES

| Component            | File                                  | Role                                                           |
| -------------------- | ------------------------------------- | -------------------------------------------------------------- |
| `Providers`          | `components/providers.tsx`            | Query client + i18n + auth guard + toaster                     |
| `AuthGuard`          | `components/auth-guard.tsx`           | Public path allowlist + protected redirect + query cache clear |
| `AttendanceGuard`    | `components/attendance-guard.tsx`     | Attendance-required content gate using `useAttendanceToday`    |
| `Header`             | `components/header.tsx`               | App title + site snippet + locale switcher + system banner     |
| `BottomNav`          | `components/bottom-nav.tsx`           | Fixed mobile nav with center create action                     |
| `SystemBanner`       | `components/system-banner.tsx`        | Severity-based notice strip from `/system/status`              |
| `LocaleSwitcher`     | `components/locale-switcher.tsx`      | Locale dropdown + localStorage persistence                     |
| `PostCard`           | `components/post-card.tsx`            | Post list card + status/category badges                        |
| `PointsCard`         | `components/points-card.tsx`          | Balance + monthly delta summary                                |
| `RankingCard`        | `components/ranking-card.tsx`         | Rank card linking to `/points`                                 |
| `UnsafeWarningModal` | `components/unsafe-warning-modal.tsx` | AlertDialog wrapper for unsafe-behavior submit confirmation    |

## PATTERNS

- Components consume `useTranslation()` keys; no inline translation map.
- Guard components return spinner/null/fallback early; page body renders only after gate pass.
- `BottomNav` active state uses `pathname.startsWith(item.href)`.
- `PostCard` maps enum values (`Category`, `ReviewStatus`, `ActionStatus`) to badges.
- `SystemBanner` severity style map: `critical | warning | info`.
- Provider order fixed: `QueryClientProvider -> I18nProvider -> AuthGuard`.

## GOTCHAS

- `AuthGuard` treats only `/`, `/login`, `/login/*` as public paths.
- `AuthGuard` clears React Query cache on logout; keep side-effect intact.
- `LocaleSwitcher` writes `i18n-locale` directly; aligned with i18n context loader.
- `BottomNav` has center button label empty string by design.
- `PostCard` shows +100P badge only on `ReviewStatus.APPROVED`.
- `AttendanceGuard` returns `null` when not authenticated; page can look empty if used outside auth flow.
