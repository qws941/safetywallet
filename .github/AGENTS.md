# AGENTS: .GITHUB

## DELTA SCOPE

Repo automation config surface.
Exact files present in this directory only.

## CURRENT FILE SET

- `.github/dependabot.yml`
- `.github/labeler.yml`
- `.github/workflows/*.yml` (9 workflow files)

## OWNERSHIP SPLIT

- This file: top-level automation config (`dependabot`, label mapping).
- `workflows/AGENTS.md`: per-workflow behavior and guardrails.

## TOP-LEVEL CONFIG NOTES

- `dependabot.yml`
  - npm + github-actions updates
  - weekly Monday cadence
  - reviewer `jclee-v1`
  - grouped minor/patch npm updates
- `labeler.yml`
  - path->label mapping for docs/ci/terraform/docker/python/typescript/shell/config

## MODULE RULES

- Keep labels/config generic and path-driven.
- Keep bot configs free of project secrets.
- Keep workflow references aligned with real files only.
- Any new workflow file must be reflected in `workflows/AGENTS.md`.

## ANTI-DRIFT

- Do not reference removed workflow files.
- Do not duplicate policy text already owned by root AGENTS.
- Do not place runtime artifacts under `.github/`.
