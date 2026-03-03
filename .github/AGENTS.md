# AGENTS: .GITHUB

## SCOPE DELTA

- Top-level GitHub automation config only.
- Workflow-specific details live in `.github/workflows/AGENTS.md`.

## TOP-LEVEL INVENTORY (CURRENT)

- `dependabot.yml`
- `labeler.yml`
- `release-drafter.yml`
- `FUNDING.yml`
- `ISSUE_TEMPLATE/` (3 templates: `bug_report.yml`, `feature_request.yml`, `config.yml`)
- `workflows/` (16 workflow files + local AGENTS)

## CONFIG SNAPSHOT

- `dependabot.yml`
  - ecosystems: `npm`, `github-actions`
  - cadence: weekly Monday
  - reviewer: `jclee-v1`
  - grouped minor/patch npm updates
- `labeler.yml`
  - path-based labels for docs/ci/terraform/docker/python/typescript/shell/config
- `release-drafter.yml`
  - release note category policy (workflow consumer)

## MODULE RULES

- Keep bot configs secret-free and path-driven.
- Keep template and label mappings aligned with active repo structure.
- Keep workflow file references delegated to `workflows/AGENTS.md`.
- Any workflow add/remove requires updates in workflow AGENTS.

## ANTI-DRIFT

- No stale workflow counts at top-level.
- No duplicate repo-root policy prose.
- No runtime artifacts committed under `.github/`.
