# Docs

Project documentation index, runbooks, and redirect stubs.

## Inventory

- `AGENTS.md` — this directory-level documentation contract.
- `README.md` — docs landing index and navigation pointers.
- `cloudflare-operations.md` — operational source of truth (deploy/ops/incident guidance).
- `FEATURE_CHECKLIST.md` — implementation checklist by feature area.
- `deployment.md` — redirect stub to `cloudflare-operations.md`.
- `rollback.md` — redirect stub to `cloudflare-operations.md`.
- `REQUIREMENTS_REVIEW.md` — redirect stub to `requirements/REQUIREMENTS_CHECKLIST.md`.
- `requirements/` — PRD/requirements subtree with its own local AGENTS contract.

## Conventions

- Keep operational procedures centralized in `cloudflare-operations.md`.
- Keep requirement tracking centralized in `requirements/REQUIREMENTS_CHECKLIST.md`.
- Redirect docs remain short and point to canonical docs only.
- Keep `README.md` synchronized whenever docs are added, moved, or retired.
- Never include plaintext secrets; refer to env variable names only.

## Drift Guards

- No duplicate long-form source-of-truth content across sibling docs.
- No substantive guidance embedded in redirect-only files.
- No stale file references in `README.md` or this inventory.
- Keep `requirements/` ownership delegated to its local `docs/requirements/AGENTS.md`.
- Update this file when top-level docs file count or purpose changes.
