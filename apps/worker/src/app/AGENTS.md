# Worker App Routes

App Router page layer for worker flows (`src/app`).

## Purpose

- Own route topology, root layout shell, route-level boundaries, and redirects
- Keep API/business logic in hooks/lib; route files compose UI and invoke hooks
- Current route surface: 16 `page.tsx` routes across 11 route/test directories

## Files

- `layout.tsx` - root shell (`html lang="ko"`, viewport, `Providers`, `ErrorBoundary`)
- `page.tsx` - hydration-aware root redirect to `/login/` or `/home/`
- `error.tsx` - app-level route error boundary
- `globals.css` - global styles and Tailwind imports
- `actions/` - list + detail route (`view`) and route-local helpers/error boundary
- `announcements/` - announcements list page + tests
- `education/` - list, `quiz-take`, and `view` routes + route-local boundary
- `home/` - authenticated landing route
- `login/` - login page + route-local `login-client.tsx`
- `points/` - points history route
- `posts/` - list, `new`, and `view` routes + route-local boundary
- `profile/` - profile route + route-local boundary
- `register/` - redirect-only route to `/login/`
- `votes/` - voting route + route-local boundary
- `__tests__/` - root route tests

## Route Map (16 pages)

| Route                  | File                           |
| ---------------------- | ------------------------------ |
| `/`                    | `page.tsx`                     |
| `/actions`             | `actions/page.tsx`             |
| `/actions/view`        | `actions/view/page.tsx`        |
| `/announcements`       | `announcements/page.tsx`       |
| `/education`           | `education/page.tsx`           |
| `/education/quiz-take` | `education/quiz-take/page.tsx` |
| `/education/view`      | `education/view/page.tsx`      |
| `/home`                | `home/page.tsx`                |
| `/login`               | `login/page.tsx`               |
| `/points`              | `points/page.tsx`              |
| `/posts`               | `posts/page.tsx`               |
| `/posts/new`           | `posts/new/page.tsx`           |
| `/posts/view`          | `posts/view/page.tsx`          |
| `/profile`             | `profile/page.tsx`             |
| `/register`            | `register/page.tsx`            |
| `/votes`               | `votes/page.tsx`               |

## Conventions

- Protected pages typically compose `Header` + content + `BottomNav`
- Detail pages use query string IDs (for example `?id=...`)
- Redirect targets stay slash-normalized (`/login/`, `/home/`)
- Login flow remains route-local in `login/login-client.tsx`
- Post create route supports offline queue create and deferred media upload
- Route-local boundaries exist for volatile domains (`actions`, `education`, `posts`, `profile`, `votes`)

## Anti-Patterns

- Do not add registration form UI under `/register`; it is redirect-only
- Do not remove hydration guard before root redirect execution
- Do not move domain API calls directly into route files when a hook exists
- Do not hardcode locale text in route UI; use translation keys
