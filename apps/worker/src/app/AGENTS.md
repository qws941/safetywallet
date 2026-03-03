# AGENTS: WORKER APP ROUTES

## PURPOSE

- Next App Router page layer for worker flows.
- Owns route topology, page composition, redirect behavior.
- Keeps per-route logic in route folders; shared logic in `src/components`/`src/hooks`.

## FILES/STRUCTURE

- Route shell: `layout.tsx` (`html lang="ko"`, fixed mobile viewport, provider mount).
- Entry redirect: `page.tsx` (`/` -> `/login/` or `/home/` after hydration).
- 16 route pages (`**/page.tsx`):
  - `/` -> `app/page.tsx`
  - `/actions` -> `app/actions/page.tsx`
  - `/actions/view` -> `app/actions/view/page.tsx`
  - `/announcements` -> `app/announcements/page.tsx`
  - `/education` -> `app/education/page.tsx`
  - `/education/quiz-take` -> `app/education/quiz-take/page.tsx`
  - `/education/view` -> `app/education/view/page.tsx`
  - `/home` -> `app/home/page.tsx`
  - `/login` -> `app/login/page.tsx` (wrapper)
  - `/points` -> `app/points/page.tsx`
  - `/posts` -> `app/posts/page.tsx`
  - `/posts/new` -> `app/posts/new/page.tsx`
  - `/posts/view` -> `app/posts/view/page.tsx`
  - `/profile` -> `app/profile/page.tsx`
  - `/register` -> `app/register/page.tsx`
  - `/votes` -> `app/votes/page.tsx`
- Route-local support files exist (for example `app/login/login-client.tsx`, `app/actions/view/*`).

## CONVENTIONS

- Protected screens typically compose `Header` + page body + `BottomNav`.
- Detail routes use query string IDs (`/posts/view?id=...`, `/actions/view?id=...`, `/education/view?id=...`).
- Redirect paths use trailing slash targets (`/login/`, `/home/`).
- Login flow remains route-local (`app/login/login-client.tsx`) and does explicit `/auth/login` then `/auth/me`.
- New post flow supports offline create (`offlineQueue: true`) and post-create media upload.
- New post draft retention: 24h; migrates legacy key to `safetywallet_post_draft_*`.

## ANTI-PATTERNS

- Do not add registration UI under `/register`; route intentionally redirects to `/login/`.
- Do not remove hydration guard before redirect in `app/page.tsx`.
- Do not assume media upload success equals post create success in `posts/new`.
- Do not hardcode route text in Korean/English directly in new pages; use translation keys.
