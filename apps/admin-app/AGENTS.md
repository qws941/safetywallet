# ADMIN-APP (Next.js 14 Dashboard)

## OVERVIEW

Admin dashboard for site managers. Next.js 14 App Router, static export to CF Pages (port 3001). 17 pages, 12-item sidebar.

## STRUCTURE

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Root redirect
│   ├── login/page.tsx                # Admin login
│   ├── sites/page.tsx                # Site management
│   ├── users/page.tsx                # User list
│   ├── users/[id]/page.tsx           # User detail (dynamic)
│   ├── posts/page.tsx                # Post management
│   ├── posts/[id]/page.tsx           # Post detail (dynamic)
│   ├── education/page.tsx            # Education mgmt (1391L — BLOATED, needs split)
│   ├── approvals/page.tsx            # Approval workflow
│   ├── announcements/page.tsx        # Announcements
│   ├── votes/page.tsx                # Vote management
│   ├── points/page.tsx               # Points ledger
│   ├── policies/page.tsx             # Safety policies
│   ├── (dashboard)/                  # Route group (shared layout)
│   │   ├── layout.tsx                # Dashboard sidebar layout
│   │   ├── page.tsx                  # Dashboard home (8 stat cards + chart)
│   │   └── attendance/page.tsx       # Attendance (30s real-time refetch)
│   └── settings/page.tsx             # App settings
├── components/
│   ├── sidebar.tsx                   # 281L, 12 menu items, collapsible
│   ├── header.tsx                    # Top header
│   ├── data-table.tsx                # 269L, generic: search/sort/pagination/selection
│   ├── stats-card.tsx                # Dashboard stat cards
│   ├── user-form.tsx                 # User create/edit form
│   └── approvals/                    # Approval-specific components
│       ├── approval-list.tsx
│       ├── approval-detail.tsx
│       ├── approval-actions.tsx
│       └── approval-filters.tsx
├── hooks/
│   ├── use-auth.ts                   # Auth wrapper
│   ├── use-api.ts                    # 1288L, 60+ hooks (MONOLITHIC — needs split)
│   └── use-votes.ts                  # Vote hooks (separated — good pattern)
├── stores/
│   └── auth.ts                       # Zustand auth store
└── lib/
    ├── api.ts                        # API client + token refresh
    └── utils.ts                      # cn() re-export
```

## KEY DETAILS

| Component  | Detail                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| Dashboard  | 8 stat cards (users, posts, sites, etc.) + category distribution chart   |
| data-table | Generic, reusable: column sort, search filter, pagination, row selection |
| Attendance | 30-second auto-refetch interval                                          |
| use-api.ts | **1288 lines, 60+ hooks** — monolithic, refactor candidate               |
| education  | **1391 lines** — single-page CRUD for courses/quizzes/TBM                |

## CONVENTIONS

- **ALL pages `'use client'`** — zero RSC, static export
- **Dynamic routes**: `[id]` pattern for user/post detail pages
- **Route groups**: `(dashboard)/` for shared sidebar layout
- **API base**: `NEXT_PUBLIC_API_URL` env or `http://localhost:3333`
- Same auth/API patterns as worker-app (Zustand + TanStack Query)

## ANTI-PATTERNS

- **Known**: `hooks/use-api.ts:~310` — `useAuditLogs()` returns `Promise.resolve()` (placeholder, HIGH priority)
- No `alert()`/`confirm()` — use modal components
- **Refactor targets**: `use-api.ts` (split by domain), `education/page.tsx` (extract sub-components)
