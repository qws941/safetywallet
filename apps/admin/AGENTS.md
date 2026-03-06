# Admin Dashboard

## PURPOSE

- Workspace map for admin frontend ownership.
- Keep subtree inventories aligned to live files.

## INVENTORY

- Root config/runtime files:
  - `package.json`
  - `next.config.js`
  - `tailwind.config.js`
  - `tsconfig.json`
  - `vitest.config.ts`
- Application source root: `src/`.
- Route layer: `src/app/` (`9` files, `19` subdirs, `7` TS/TSX at root).
- Shared component layer: `src/components/` (`8` files, `5` subdirs, `7` TS/TSX at root).
- Hook layer: `src/hooks/` (`44` files, `1` subdir, `43` TS/TSX at root).
- Store layer: `src/stores/` (`2` files, `1` subdir, `1` TS at root).
- Utility/transport layer: `src/lib/` (`3` files, `1` subdir, `2` TS at root).
- Local contracts:
  - `src/app/AGENTS.md`
  - `src/components/AGENTS.md`
  - `src/hooks/AGENTS.md`
  - `src/hooks/__tests__/AGENTS.md`
  - `src/stores/AGENTS.md`
  - `src/lib/AGENTS.md`
  - `src/app/attendance/AGENTS.md`
  - `src/app/posts/AGENTS.md`
  - `src/app/votes/AGENTS.md`
  - `src/app/education/AGENTS.md`

## CONVENTIONS

- Keep route orchestration in `src/app/*`; move request lifecycle into hooks.
- Keep reusable UI in `src/components/*`; keep route-local UI inside route subtrees.
- Keep token/session state in `src/stores/auth.ts`; do not mirror in hooks.
- Keep transport and error normalization in `src/lib/api.ts`.
- Update child AGENTS docs in same change when adding/removing modules.

## ANTI-PATTERNS

- Adding admin module files without updating nearest subtree AGENTS inventory.
- Cross-importing route-local helpers into unrelated feature directories.
- Storing API side effects inside presentational components.
- Keeping stale route counts after tree changes (for example new top-level route dirs).

## DRIFT GUARDS

- Verify root subtree counts before merge: `src/app`, `src/components`, `src/hooks`, `src/stores`, `src/lib`.
- Verify `src/app/AGENTS.md` route list includes all current top-level route folders.
- Verify every child AGENTS section set exists: `PURPOSE`, `INVENTORY`, `CONVENTIONS`, `ANTI-PATTERNS`, `DRIFT GUARDS`.
- Verify removed files are removed from inventories in the same commit.
