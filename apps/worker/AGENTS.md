# Worker App

Next.js 15 App Router PWA for field workers, optimized for static export and mobile runtime.

## Purpose

- Worker journey: login -> home -> posts/actions/education/votes/points/profile
- Offline-first create flows with client queue + replay on reconnect
- Client-only i18n runtime (custom provider/hooks, not Next built-in i18n routing)
- Cloudflare Pages-style static build (`output: "export"`, `trailingSlash: true`)

## Files

- `next.config.mjs` - static export + `next-pwa` runtime caching rules
- `package.json` - worker app scripts and dependencies
- `postcss.config.cjs` - PostCSS config
- `tailwind.config.js` - Tailwind theme tokens
- `tsconfig.json` - TypeScript config
- `vitest.config.ts` - test runner config
- `I18N_IMPLEMENTATION.md` - i18n implementation notes
- `public/` - manifest, icons, PWA static assets
- `src/app/` - route layer (11 route/test directories, 16 `page.tsx` routes)
- `src/components/` - 13 reusable client components + provider shell
- `src/hooks/` - 14 hook modules for API/auth/i18n/PWA behavior
- `src/stores/` - Zustand auth store (`safetywallet-auth`)
- `src/i18n/` - config, loader, provider context, translator helpers
- `src/locales/` - locale bundles (`ko.json`, `en.json`, `vi.json`, `zh.json`)
- `src/lib/` - API transport, offline queue, image compression, sanitization, utils

## Conventions

- Provider stack in `src/components/providers.tsx`:
  `QueryClientProvider -> I18nProvider -> AuthGuard -> children + OfflineQueueIndicator + Toaster + InstallBanner`
- Root redirect in `src/app/page.tsx` uses hydration-aware `window.location.replace`
- API transport entrypoint is `src/lib/api.ts` (`apiFetch` + 401 refresh mutex)
- API base URL resolves `NEXT_PUBLIC_API_URL || "/api"`
- Offline queue storage key: `safetywallet_offline_queue` (migrates `safework2_offline_queue`)
- Auth store persistence key: `safetywallet-auth`
- Draft and install keys: `safetywallet_post_draft_<siteId>`, `safetywallet-install-dismissed`
- PWA runtime caching rules live in `next.config.mjs` (`/api`, image, navigation)

## Anti-Patterns

- Do not add server-only assumptions; this app ships as static export
- Do not bypass `apiFetch` for authenticated API requests
- Do not change storage keys without migration handling
- Do not replace redirect `window.location.replace` flows with client router pushes
- Do not duplicate translation dictionaries inside pages/components
