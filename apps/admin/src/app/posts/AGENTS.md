# AGENTS: POSTS

## SCOPE

- Admin post review section.
- Covers list page filters, post detail composition, review/assignment UI blocks.

## FILE MAP

- `page.tsx` - post list route with multi-filter DataTable.
- `[id]/page.tsx` - static-export wrapper route.
- `[id]/post-detail.tsx` - detail page orchestrator.
- `[id]/post-detail-helpers.ts` - status/date/label format helpers.
- `[id]/components/post-content-card.tsx` - report body/evidence presentation.
- `[id]/components/metadata-card.tsx` - author/site/status metadata.
- `[id]/components/review-history-card.tsx` - historical review timeline.
- `[id]/components/assignment-form.tsx` - reviewer assignment/actions.
- `error.tsx` - posts-scoped error fallback.

## LIST PAGE BEHAVIOR

- Filter categories: category, risk, review status, urgency, date range.
- Table interactions: search/sort/pagination/row navigation.
- Row click target: `/posts/{id}` detail page.
- Korean labels/maps used for admin-facing status semantics.

## DETAIL PAGE BEHAVIOR

- Wrapper route hands off to client detail page for static export compatibility.
- Detail layout composes content, metadata, review history, and assignment actions.
- Review action panel state depends on mutation success and refetch/invalidation.

## PATTERNS

- Single filter state object keeps reset/update deterministic.
- Enum-to-label mapping centralized in helpers/page-level maps.
- Card-based detail composition keeps each concern isolated.
- Wrapper page stays minimal: params extraction + placeholder static params.

## KNOWN CONSTRAINTS

- Keep `[id]/page.tsx` wrapper pattern intact; direct server dynamic dependency breaks static export.
- Canonical helper is `[id]/post-detail-helpers.ts` (old `post-helpers.ts` references are obsolete).
- Review side effects depend on query invalidation from hook layer, not local optimistic hacks.

## TEST SURFACE

- `page.test.tsx` covers list behavior.
- Detail cards/actions are tested in component-level suites where present.
