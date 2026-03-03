# AGENTS: WORKER APP ROOT

## PURPOSE

- Next.js 15 worker PWA runtime boundary (`apps/worker`).
- Mobile-first field workflow: login -> home -> report/action/education/vote.
- Korean-primary UI; custom i18n runtime (not Next built-in i18n).
- Offline-first submissions via local queue + online replay.

## FILES/STRUCTURE

- Root config/runtime: `next.config.mjs` (`output: export`, `trailingSlash: true`, `next-pwa`).
- App routes: `src/app/` (16 `page.tsx` entries, plus route-local helpers/tests).
- Reusable UI: `src/components/` (13 core components + `providers.tsx`).
- Data/client hooks: `src/hooks/` (14 hook modules + barrel `use-api.ts`).
- State: `src/stores/auth.ts` (single Zustand auth store, persisted).
- I18n: `src/i18n/` (config, loader, context, translator, index).
- Runtime utilities: `src/lib/` (`api.ts`, `image-compress.ts`, `sanitize-html.ts`, `utils.ts`).

## CONVENTIONS

- Provider order fixed in `src/components/providers.tsx`:
  `QueryClientProvider -> I18nProvider -> AuthGuard -> OfflineQueueIndicator -> Toaster -> InstallBanner`.
- Root route `src/app/page.tsx` redirects by hydration/auth state using `window.location.replace`.
- Auth/public route gating lives in `src/components/auth-guard.tsx`.
- `NEXT_PUBLIC_API_URL` defaults to `/api`; API calls centralized in `src/lib/api.ts`.
- Offline queue primary key: `safetywallet_offline_queue`; auto-migrates legacy `safework2_offline_queue`.
- Post draft primary key pattern: `safetywallet_post_draft_<siteId>`; migrates legacy `safework2_post_draft_<siteId>`.
- PWA install dismissal key: `safetywallet-install-dismissed` (7-day suppression).

## ANTI-PATTERNS

- Do not reintroduce `safework2_*` as primary storage keys; keep migration path only.
- Do not bypass `apiFetch` for normal authenticated API flows.
- Do not move auth redirects to `router.push`; `window.location.replace` is intentional here.
- Do not duplicate i18n sources per page/component; consume `useTranslation`/`useLocale`.
