# AGENTS: COMPONENTS

## SCOPE

- Shared admin components in `src/components`.
- Includes shell/nav, reusable primitives, and feature component subtrees.

## DIRECTORY SNAPSHOT

- `admin-shell.tsx` - protected frame + auth gate.
- `sidebar.tsx` - desktop/sidebar rail, mobile header label, site switch.
- `providers.tsx` - QueryClient provider + bootstrap/hydration guard + toaster.
- `data-table.tsx` - reusable searchable/sortable/paginated table shell.
- `image-lightbox.tsx` - image preview overlay component.
- `rich-text-editor.tsx` - Tiptap-based editor surface.
- `review-actions.tsx` - review workflow action widget.
- `stats-card.tsx` - dashboard metric card.
- `approvals/` - approvals-specific dialog/list/history/reject components.
- `review-actions/` - split review action UI pieces.
- `votes/` - vote-specific shared dialog/components.
- `ui/` - local UI primitives (including table variant).
- `__tests__/` - component unit tests.

## COMPOSITION PATTERNS

- `AdminShell` wraps protected pages and redirects unauthenticated users.
- `Providers` centralizes React Query bootstrap and app-level providers.
- Sidebar handles navigation and site context switching; query cache hygiene occurs at this boundary.
- Feature pages compose cards/panels from this folder instead of embedding large JSX in route files.

## CURRENT NAV MODEL

- No drawer-based mobile sidebar in current architecture.
- Sidebar always mounted:
  - mobile: icon rail (`w-16`)
  - desktop: expandable pane (`md:w-64`)
- `MobileHeader` is label/header only; menu toggle state removed.

## CONSTRAINTS

- Keep route-specific business logic in hooks/pages; components stay presentation + interaction shell.
- Avoid duplicating primitives from `@safetywallet/ui` unless admin-specific behavior is required.
- Do not reintroduce removed `MobileSidebar` patterns.

## TEST NOTES

- Component behavior tests live in `src/components/__tests__`.
- Hook/network assertions belong to hook test suites, not component tests.
