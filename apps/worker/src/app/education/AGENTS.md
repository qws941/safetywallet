# Worker Education

## PURPOSE

- Worker education route contract for tabbed learning flows plus content-view and quiz-taking routes.
- Keeps the root tab shell separate from dedicated learning detail routes.

## INVENTORY

- Root files (2): `page.tsx`, `error.tsx`.
- Root tests: `__tests__/page.test.tsx`.
- View subtree `view/` (2 files): `page.tsx`, `__tests__/page.test.tsx`.
- Quiz subtree `quiz-take/` (2 files): `page.tsx`, `__tests__/page.test.tsx`.
- Local doc: `AGENTS.md`.

## CONVENTIONS

- Keep `page.tsx` as the tab shell for materials, quizzes, and TBM lists.
- Keep content detail and quiz execution in `view/` and `quiz-take/`, not back in the root tab shell.
- Keep tab-local UI/state in the route file; transport and mutation logic stay in hooks.
- Keep all copy on translation keys, including quiz and TBM empty/error states.

## ANTI-PATTERNS

- Turning the root tab shell into a full detail-route replacement.
- Duplicating quiz or TBM interaction logic across root and leaf routes.
- Introducing app-local i18n keys that bypass the shared typed catalog.
- Moving route-specific detail behavior into unrelated worker components.

## DRIFT GUARDS

- Recount `view/` and `quiz-take/` subtree files before updating inventory bullets.
- Keep root-tab responsibilities distinct from leaf-route responsibilities.
- Keep route tests aligned with root, detail, and quiz entry surfaces.
- Update parent `src/app/AGENTS.md` child-doc list if this file moves or is removed.
