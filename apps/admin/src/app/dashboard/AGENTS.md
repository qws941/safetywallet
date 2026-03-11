# Dashboard

## PURPOSE

- Admin dashboard route contract for summary cards, analytics views, and recommendation overview flows.
- Keeps dashboard-only analytics widgets inside the dashboard subtree.

## INVENTORY

- Root files (2): `page.tsx`, `page.test.tsx`.
- Subdirs (2): `analytics/`, `recommendations/`.
- `analytics/` files (8): `page.tsx`, `date-range-picker.tsx`, `points-chart.tsx`, `trend-chart.tsx`, and 4 tests.
- `recommendations/` files (2): `page.tsx`, `page.test.tsx`.
- Local doc: `AGENTS.md`.

## CONVENTIONS

- Keep `page.tsx` focused on high-level stats/alerting cards.
- Keep chart widgets and date-range controls inside `analytics/`.
- Keep recommendation-specific UI inside `recommendations/`, not in the root dashboard page.
- Keep data-fetching and metric transforms in hooks, not chart components.

## ANTI-PATTERNS

- Reusing dashboard analytics components in unrelated routes without extracting a shared UI contract first.
- Moving chart-specific state into the root dashboard page.
- Duplicating recommendation summary logic across root and nested routes.
- Putting API side effects inside presentational chart widgets.

## DRIFT GUARDS

- Recount dashboard subdirs when adding nested analytics or recommendation routes.
- Keep analytics widget/test inventory aligned with on-disk files.
- Keep root inventory limited to dashboard-owned files, not shared admin components.
- Update parent `src/app/AGENTS.md` child-doc list if this file moves or is removed.
