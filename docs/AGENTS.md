# AGENTS: DOCS

## SCOPE DELTA

- Owns `docs/` root documentation inventory + ownership.
- Repo-wide policy remains in root AGENTS/rules.

## ROOT INVENTORY (CURRENT)

- `README.md` (docs index + redirects)
- `cloudflare-operations.md` (runbook)
- `FEATURE_CHECKLIST.md` (feature tracker)
- `deployment.md` (redirect doc)
- `rollback.md` (redirect doc)
- `REQUIREMENTS_REVIEW.md` (redirect doc)
- `requirements/` (requirements subtree)

## OWNERSHIP MAP

- Operational source of truth: `cloudflare-operations.md`.
- Requirements source of truth: `docs/requirements/REQUIREMENTS_CHECKLIST.md`.
- Historical implementation plan now archived under:
  `docs/requirements/archived/SafetyWallet_Implementation_Plan_v1.0.md`.
- Redirect governance: `docs/README.md` tracks canonical targets.

## MODULE RULES

- Keep redirect files minimal, explicit, and canonical-target-first.
- Keep runbook steps executable and CI/deploy-policy consistent.
- Keep secret references as variable names only.
- Keep naming references accurate (`safetywallet` current, legacy `safework2-*` where required).
- Keep docs index synchronized on file add/remove/move.

## SUBMODULE

- `docs/requirements/AGENTS.md` owns requirement-doc specifics.

## ANTI-DRIFT

- No duplicate source-of-truth text across multiple docs.
- No primary guidance in redirect stubs.
- No stale path references after archive moves.
