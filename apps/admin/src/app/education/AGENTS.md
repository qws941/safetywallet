# AGENTS: EDUCATION

## SCOPE

- Education admin hub under one route: `education/page.tsx`.
- Covers tabbed UI for contents, quizzes, statutory training, TBM.

## FILE MAP

- `page.tsx` - tab shell and section switching.
- `education-helpers.ts` - tab metadata (`tabItems`) + `TabId` typing.
- `components/contents-tab.tsx` - content/material management tab.
- `components/quizzes-tab.tsx` - quiz/question management tab.
- `components/statutory-tab.tsx` - statutory education management tab.
- `components/tbm-tab.tsx` - toolbox meeting management tab.
- `components/education-types.ts` - local tab/domain UI types.

## ARCHITECTURE

- Single-route, multi-tab design (no per-tab route trees).
- Tab switch state lives in page shell; each tab component owns its own UI data lifecycle.
- Strongly typed tab IDs keep render switch exhaustive and predictable.

## TAB RESPONSIBILITIES

- Contents tab: material listing/create/update/delete flows.
- Quizzes tab: quiz catalog + question CRUD flows.
- Statutory tab: legal training templates/records management.
- TBM tab: toolbox meeting content and schedule/record handling.

## CONSTRAINTS

- Do not split into nested routes unless export strategy changes; current static export favors one tabbed page.
- Keep tab components domain-focused; avoid cross-tab shared mutable state.
- Older route references like `materials/page.tsx` or quiz detail routes are obsolete in current structure.

## TEST SURFACE

- `education/__tests__/*` covers helpers and tab behavior.
- Hook/API behaviors validated in `src/hooks/use-education-*.ts` tests.

## BOUNDARY NOTES

- This doc is route/component scoped.
- API orchestration is in hooks (`use-education-api.ts` and split modules).
