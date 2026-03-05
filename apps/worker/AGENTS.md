# Worker App

Next.js 15 PWA for field workers. Mobile-first safety workflow app with offline-first submissions.

## Purpose

- Field worker interface: login → home → report/action/education/vote
- Korean-primary UI with custom client-side i18n (not Next built-in i18n)
- Offline-first submissions via localStorage queue + online replay
- Static export (`output: "export"`) deployed to Cloudflare Pages

## Files

- `next.config.mjs` — static export, trailing slash, next-pwa integration
- `package.json` — dependencies, scripts
- `postcss.config.cjs` — PostCSS config
- `tailwind.config.js` — Tailwind v4 theme tokens
- `tsconfig.json` — TypeScript config
- `vitest.config.ts` — test runner config
- `I18N_IMPLEMENTATION.md` — i18n design notes
- `public/` — static assets, manifest, service worker
- `src/app/` — 10 route groups (actions, announcements, education, home, login, points, posts, profile, register, votes)
- `src/components/` — 13 reusable components + providers
- `src/hooks/` — 14 hook modules
- `src/stores/` — Zustand auth store
- `src/i18n/` — locale config, loader, context, translator
- `src/lib/` — API client, offline queue, image compression, HTML sanitization, utilities

## Conventions

- Provider order in `src/components/providers.tsx`:
  `QueryClientProvider → I18nProvider → AuthGuard → {children} + OfflineQueueIndicator + Toaster + InstallBanner`
- Root route (`src/app/page.tsx`) redirects via `window.location.replace` based on hydration/auth state
- Auth/public route gating in `src/components/auth-guard.tsx`
- `NEXT_PUBLIC_API_URL` defaults to `/api`; all API calls via `src/lib/api.ts`
- Auth persist key: `safetywallet-auth`
- Offline queue key: `safetywallet_offline_queue` (auto-migrates legacy `safework2_offline_queue`)
- Post draft key pattern: `safetywallet_post_draft_<siteId>` (migrates legacy key)
- PWA install dismissal key: `safetywallet-install-dismissed` (7-day suppression)
- Tailwind v4 CSS tokens: `bg-background`, `text-foreground`, etc.

## Anti-Patterns

- Do not reintroduce `safework2_*` as primary storage keys; migration path only
- Do not bypass `apiFetch` for authenticated API flows
- Do not replace `window.location.replace` with `router.push` for auth redirects
- Do not duplicate i18n sources per page; consume `useTranslation`/`useLocale`
- Do not add server-side features; static export only
