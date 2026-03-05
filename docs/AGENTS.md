# Docs

Project documentation, runbooks, and redirect stubs.

## Files

- `README.md` — docs index with canonical redirect targets.
- `cloudflare-operations.md` — Cloudflare deployment and operations runbook.
- `FEATURE_CHECKLIST.md` — feature implementation tracker.
- `deployment.md` — redirect to `cloudflare-operations.md`.
- `rollback.md` — redirect to `cloudflare-operations.md`.
- `REQUIREMENTS_REVIEW.md` — redirect to `requirements/REQUIREMENTS_CHECKLIST.md`.
- `requirements/` — requirements and PRD subtree (see `requirements/AGENTS.md`).
- `requirements/archived/` — deprecated documents (legacy architecture plans).

## Conventions

- Operational source of truth: `cloudflare-operations.md`.
- Requirements source of truth: `requirements/REQUIREMENTS_CHECKLIST.md`.
- Redirect files are minimal stubs pointing to canonical targets.
- Keep secret references as variable names only, never values.
- Keep docs index (`README.md`) synchronized on file add/remove/move.

## Anti-patterns

- No primary guidance in redirect stubs.
- No duplicate source-of-truth text across multiple docs.
