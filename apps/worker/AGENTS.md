# Worker App

## PURPOSE

- Worker app workspace contract for `apps/worker` root.
- Keep top-level inventory + cross-module guardrails only.

## INVENTORY

- `AGENTS.md` - workspace-level contract for worker app.
- `I18N_IMPLEMENTATION.md` - i18n implementation notes.
- `next.config.mjs` - static export + `next-pwa` runtime caching.
- `package.json` - scripts + dependency surface.
- `postcss.config.cjs` - PostCSS pipeline config.
- `tailwind.config.js` - Tailwind theme config.
- `tsconfig.json` - TypeScript compiler config.
- `vitest.config.ts` - unit test runner config.
- `next-env.d.ts` - Next.js type declarations.
- `public/` - manifest + icons + static assets.
- `src/app/` - route segment tree + root layout/error.
- `src/components/` - shared UI + guards + providers.
- `src/hooks/` - client hook boundary for domains.
- `src/i18n/` - locale runtime provider/loader/translator.
- `src/lib/` - transport/offline/image/sanitizer helpers.
- `src/locales/` - locale JSON bundles.
- `src/stores/` - Zustand stores.

## CONVENTIONS

- `next.config.mjs`: keep `output: "export"`, `trailingSlash: true`, `images.unoptimized: true`.
- PWA caching tiers: `/api/*` `StaleWhileRevalidate`; images `CacheFirst`; navigation `NetworkFirst`.
- `NEXT_PUBLIC_API_URL` fallback remains `/api`.
- Provider stack remains in `src/components/providers.tsx`; do not split stack ownership.
- Offline queue key remains `safetywallet_offline_queue`; legacy key migration stays in `src/lib/api.ts`.
- Auth persist key remains `safetywallet-auth`; install-dismiss key remains `safetywallet-install-dismissed`.

## ANTI-PATTERNS

- No top-level business logic under `apps/worker/` root config files.
- No alternate fetch client parallel to `src/lib/api.ts`.
- No storage-key renames without same-change migration code.
- No route auth redirects switched from `window.location.replace` to router push.
- No direct locale JSON imports outside i18n loader/runtime.

## DRIFT GUARDS

- Recheck this inventory when root files/dirs change under `apps/worker`.
- Verify PWA runtime caching still defines API/image/navigation handlers.
- Verify `src/locales/` locale list matches `src/i18n/config.ts` locale union.
- Verify queue/auth/install localStorage keys stay aligned across lib/hooks/components/stores.
- Keep child `src/*/AGENTS.md` files module-scoped; no root-level duplication.
