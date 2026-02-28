# AGENTS: WORKER-APP

## PURPOSE

Worker PWA runtime surface. Route shell + API hooks + auth store + i18n + mobile UI.
Single-source map for `src/*` boundaries only.

## KEY FILES

| Area           | File                           | Why                                                           |
| -------------- | ------------------------------ | ------------------------------------------------------------- |
| Router root    | `src/app/layout.tsx`           | Metadata, viewport, provider mount                            |
| Route redirect | `src/app/page.tsx`             | Hydration-aware `/login/` vs `/home/` redirect                |
| Provider stack | `src/components/providers.tsx` | `QueryClientProvider -> I18nProvider -> AuthGuard -> Toaster` |
| API client     | `src/lib/api.ts`               | Auth header, 401 refresh mutex, offline queue                 |
| Auth state     | `src/stores/auth.ts`           | Persisted tokens/user/site + hydration flag                   |
| Domain hooks   | `src/hooks/use-api.ts`         | Posts, points, education, actions, recommendations            |
| Locale runtime | `src/i18n/context.tsx`         | Locale state, message loading, persistence                    |

## PATTERNS

- Route set: 16 page entries under `src/app/**/page.tsx`.
- Top-level routes: `/`, `/home`, `/login`, `/register`, `/profile`, `/announcements`, `/posts`, `/posts/new`, `/posts/view`, `/actions`, `/actions/view`, `/points`, `/votes`, `/education`, `/education/view`, `/education/quiz-take`.
- Page shell pattern: `Header` + content + `BottomNav` for authenticated screens.
- Data pattern: hooks in `src/hooks/*`; no page-level data client singleton.
- Auth pattern: `AuthGuard` handles public path allowlist + query cache clear on logout.
- Post creation pattern: `useCreatePost` for record; `apiFetch` multipart for image upload.
- Offline pattern: `apiFetch(..., { offlineQueue: true })` + auto flush on `online` event.

## GOTCHAS

- `src/app/login/page.tsx` thin wrapper; real logic in `src/app/login/login-client.tsx`.
- Redirects use `window.location.replace` with trailing slash targets (`/login/`, `/home/`).
- Offline queue key still `safework2_offline_queue`; not `safetywallet_*`.
- Draft key in new post page uses `safework2_post_draft_*` prefix.
- `src/hooks/use-api.ts` includes recommendation hooks, but `/votes` page currently calls `useQuery/useMutation` directly.
- i18n config declares `ko/en/vi/zh`; loader currently imports `ko/en` only.
