# Worker Route Layer

## PURPOSE

- App Router route tree contract for `src/app`.
- Keep route composition, redirects, and route boundaries consistent.

## INVENTORY

- `AGENTS.md` - route-layer contract.
- `layout.tsx` - root HTML/body shell + skip link + providers wrapper.
- `page.tsx` - hydration-gated root redirect.
- `error.tsx` - app-level route error fallback.
- `globals.css` - app-wide CSS entry.
- `actions/` - actions list + detail routes + segment boundary.
- `announcements/` - announcements list route.
- `education/` - education list/view/quiz routes + segment boundary.
- `home/` - post-login landing route.
- `login/` - login route + route-local client component.
- `points/` - point history route.
- `posts/` - post list/new/view routes + segment boundary.
- `profile/` - profile route + segment boundary.
- `register/` - legacy registration entry route.
- `votes/` - voting route + segment boundary.
- `__tests__/` - route-level tests.

## CONVENTIONS

- Route page surface currently includes 16 `page.tsx` files.
- Error boundary files currently exist at app root + `actions` + `education` + `posts` + `profile` + `votes`.
- Root redirect waits for store hydration; unauthenticated -> `/login/`, authenticated -> `/home/`.
- Redirect targets remain trailing-slash normalized in root/login/register flow.
- Detail routes use query params (`?id=...`) instead of path params in current design.
- Route files compose hooks/components; transport and cache logic stay outside this directory.

## ANTI-PATTERNS

- No data-fetching client duplication inside pages when domain hook exists.
- No registration form implementation under `register/`; route stays redirect-only.
- No removal of root hydration gate before redirect logic.
- No segment-level error boundary deletion for volatile domains.
- No hardcoded copy in pages; use translation keys.

## DRIFT GUARDS

- Recount `**/page.tsx` and segment folders when route surface changes.
- Recheck boundary placement whenever a new volatile domain route is added.
- Verify `layout.tsx` still wraps children with global error boundary + providers.
- Verify root/login/register redirects remain consistent after auth flow changes.
- Keep this file route-layer only; provider/store/lib rules belong in sibling modules.
