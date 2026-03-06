# AGENTS: .GITHUB

## SCOPE DELTA

- Own top-level GitHub metadata/config files only.
- Workflow-level inventory and coupling live in `.github/workflows/AGENTS.md`.

## TOP-LEVEL INVENTORY (CURRENT)

- `CODEOWNERS`
- `dependabot.yml`
- `labeler.yml`
- `release-drafter.yml`
- `FUNDING.yml`
- `PULL_REQUEST_TEMPLATE.md`
- `ISSUE_TEMPLATE/` (4 templates: `bug_report.yml`, `feature_request.yml`, `task.yml`, `config.yml`)
- `workflows/` (23 workflow files + local `AGENTS.md`)

## CONFIG SNAPSHOT

- `dependabot.yml`
  - ecosystems: `npm`, `github-actions`
  - cadence: weekly
  - grouped patch/minor updates
- `labeler.yml`
  - path-based labels (docs/ci/terraform/docker/python/typescript/shell/config)
- `release-drafter.yml`
  - release category mapping and changelog policy

## MODULE RULES

- Keep metadata/config secret-free and path-driven.
- Keep top-level inventory synchronized with actual file tree.
- Keep workflow details delegated to `.github/workflows/AGENTS.md`.
- On workflow add/remove, update both workflow AGENTS and top-level counts.
- Keep issue template inventory and counts synchronized with `ISSUE_TEMPLATE/` tree.

## ANTI-DRIFT

- No stale template/workflow counts.
- No duplication of repo-root conventions already covered in root `AGENTS.md`.
- No runtime artifacts committed under `.github/`.
- No top-level config references that disagree with actual file names.
