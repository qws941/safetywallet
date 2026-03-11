# Worker Posts

## PURPOSE

- Worker posts route contract for report list, new report, and detail view flows.
- Keeps list, creation, and detail responsibilities split across dedicated routes.

## INVENTORY

- Root files (2): `page.tsx`, `error.tsx`.
- Root tests: `__tests__/page.test.tsx`.
- New route subtree `new/` (2 files): `page.tsx`, `__tests__/page.test.tsx`.
- View route subtree `view/` (2 files): `page.tsx`, `__tests__/page.test.tsx`.
- Local doc: `AGENTS.md`.

## CONVENTIONS

- Keep `page.tsx` as the list shell for filters, infinite scroll, and CTA into `new/`.
- Keep create flow in `new/` and detail flow in `view/`; do not collapse them back into the list page.
- Keep detail routing on query params (`/posts/view?id=...`) until route design changes at the parent layer.
- Keep transport and cache behavior in hooks/lib, not route-local wrappers.

## ANTI-PATTERNS

- Re-implementing list filtering or infinite-scroll logic inside `new/` or `view/`.
- Introducing path-param detail routes without updating the parent route contract.
- Moving post create/detail behavior into shared unrelated route utilities.
- Hardcoding review-status copy instead of using translation keys and shared enums.

## DRIFT GUARDS

- Recount `new/` and `view/` subtree files before updating inventory bullets.
- Keep list/new/view split explicit when route responsibilities change.
- Keep route tests aligned with each entry surface.
- Update parent `src/app/AGENTS.md` child-doc list if this file moves or is removed.
