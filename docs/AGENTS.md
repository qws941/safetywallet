# AGENTS: DOCS

## DELTA SCOPE

`docs/` module-specific documentation ownership.
Global policy remains in repo-root AGENTS.

## CURRENT FILE SET

- `README.md` docs index + redirect map
- `cloudflare-operations.md` operational runbook
- `FEATURE_CHECKLIST.md` feature completion tracker
- `deployment.md` redirect stub
- `rollback.md` redirect stub
- `REQUIREMENTS_REVIEW.md` redirect stub
- `requirements/` requirement specs subtree

## DOC OWNERSHIP

- Operations truth: `cloudflare-operations.md`
- Requirements truth entrypoint: `requirements/REQUIREMENTS_CHECKLIST.md`
- Historical/deprecated marker: `requirements/SafetyWallet_Implementation_Plan_v1.0.md`
- Redirect governance: `README.md` must list every redirect doc

## MODULE RULES

- Keep redirect docs short and explicit (`Moved` + canonical target).
- Keep runbook instructions executable and CI-automation aligned.
- Keep secret references as names only (`CLOUDFLARE_*`, `SLACK_*`, etc.).
- Keep resource naming notes current (`safewallet` runtime vs legacy `safework2-*` infra IDs).
- Keep docs index synchronized when adding/removing docs files.

## SUBMODULE DOC

- `docs/requirements/AGENTS.md` owns requirement-subtree deltas.

## ANTI-DRIFT

- Do not duplicate the same source-of-truth across multiple docs.
- Do not present redirect files as primary documentation.
- Do not keep stale workflow/deploy statements after workflow changes.
