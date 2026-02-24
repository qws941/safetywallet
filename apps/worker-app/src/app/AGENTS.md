# AGENTS: APP

## PURPOSE

Route-level composition for worker flows.
Owns page topology, page shell usage, route redirect behavior.

## KEY FILES

| Route                  | File                               | Notes                                              |
| ---------------------- | ---------------------------------- | -------------------------------------------------- |
| `/`                    | `app/page.tsx`                     | Hydration-aware redirect to login/home             |
| `/login`               | `app/login/page.tsx`               | Wrapper only                                       |
| `/login` logic         | `app/login/login-client.tsx`       | Credential submit + `/auth/me` site sync           |
| `/home`                | `app/home/page.tsx`                | Posts + points + leaderboard summary               |
| `/posts`               | `app/posts/page.tsx`               | Infinite query + status filter chips               |
| `/posts/new`           | `app/posts/new/page.tsx`           | Draft autosave + image compression + warning modal |
| `/actions`             | `app/actions/page.tsx`             | Action list by status                              |
| `/actions/view`        | `app/actions/view/page.tsx`        | Status update + image upload/delete                |
| `/education`           | `app/education/page.tsx`           | Contents + quizzes + TBM tabs                      |
| `/education/quiz-take` | `app/education/quiz-take/page.tsx` | Attempt submit + result rendering                  |
| `/votes`               | `app/votes/page.tsx`               | Recommendation submit + history toggle             |
| Root shell             | `app/layout.tsx`                   | Metadata/viewport/html lang/provider mount         |

## PATTERNS

- 16 page files under `app/**/page.tsx`; all include `'use client'`.
- Auth-required screens compose `Header` + content + `BottomNav`.
- Detail pages use query params (`/posts/view?id=...`, `/actions/view?id=...`, `/education/view?id=...`).
- `/register` hard-redirects to `/login/`; no registration form route active.
- Redirect behavior uses `window.location.replace` to avoid back-stack loops.
- Page data loading mostly via hooks in `src/hooks/use-api.ts`.

## GOTCHAS

- `/votes` page bypasses recommendation hooks from `use-api.ts`; uses inline React Query calls.
- `login-client.tsx` uses direct `fetch` to `/auth/login` and `/auth/me`, not `apiFetch`.
- `posts/new` keeps local draft for 24h via `safework2_post_draft_<siteId>`.
- `posts/new` uploads images after post create; post success can coexist with partial image failure.
- `education/page.tsx` gates content items with `AttendanceGuard`.
- `layout.tsx` sets `maximumScale: 1` and `userScalable: false`; preserve mobile UX intent.
