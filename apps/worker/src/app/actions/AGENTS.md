# Worker Actions

## PURPOSE

- Worker actions route contract for assignment list and action-detail flows.
- Keeps the detail experience split from the list shell while preserving query-param routing.

## INVENTORY

- Root files (2): `page.tsx`, `error.tsx`.
- Root tests: `__tests__/page.test.tsx`.
- Detail subtree `view/` (5 files): `page.tsx`, `action-detail-content.tsx`, `action-image-gallery.tsx`, `loading-state.tsx`, `__tests__/page.test.tsx`.
- Local doc: `AGENTS.md`.

## CONVENTIONS

- Keep `page.tsx` as the list shell for status filters and card navigation.
- Keep detail routing on query params (`/actions/view?id=...`) unless the parent route contract changes.
- Keep heavy detail rendering in `action-detail-content.tsx`; keep `view/page.tsx` thin.
- Keep image gallery behavior isolated in `action-image-gallery.tsx`.

## ANTI-PATTERNS

- Expanding `view/page.tsx` into a second full detail implementation.
- Duplicating status-label or badge-color maps across list and detail files without a shared local contract.
- Moving action image behavior into generic route wrappers.
- Replacing query-param navigation with path params without updating parent route guidance.

## DRIFT GUARDS

- Recount `view/` subtree files before updating inventory bullets.
- Keep list/detail split explicit when adding new action detail widgets.
- Keep route tests aligned with list and detail entry surfaces.
- Update parent `src/app/AGENTS.md` child-doc list if this file moves or is removed.
