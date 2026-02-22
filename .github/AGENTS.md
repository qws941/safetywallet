# AGENTS: .GITHUB

## OVERVIEW

Context: CI/CD and repository automation policy. Scope: GitHub workflows, bot automation, release/deploy guards.

This directory governs quality gates and Git-ref-driven deployment automation; changes here can affect production rollout safety.

## WHERE TO LOOK

| Task                    | Location                                                | Notes                              |
| ----------------------- | ------------------------------------------------------- | ---------------------------------- |
| Update CI checks        | `workflows/ci.yml`                                      | Monorepo quality and test pipeline |
| One-click orchestration | `workflows/full-automation.yml`                         | Parametric test/deploy/release run |
| Production deploy flow  | `workflows/deploy-production.yml`                       | Git-ref deploy automation          |
| Release/version flow    | `workflows/release-tag.yml`                             | Automated or parameterized tagging |
| Staging deploy flow     | `workflows/deploy-staging.yml`                          | Pre-production release path        |
| Emergency rollback      | `workflows/deploy-rollback.yml`                         | Controlled revert workflow         |
| PR automation labels    | `labeler.yml`, `workflows/labeler.yml`                  | Path-based label routing           |
| Dependency updates      | `dependabot.yml`, `workflows/auto-merge-dependabot.yml` | Bot update and merge policy        |

## SUBMODULE DOCS

- `workflows/AGENTS.md` contains workflow-level implementation guidance and per-file responsibilities.

## CONVENTIONS

- Deploy is CI-driven; local manual deploy scripts are intentionally blocked at repo root.
- Keep workflow triggers explicit (`push`, `pull_request`, `workflow_dispatch`) and least-privilege.
- Preserve branch/environment separation between staging and production workflows.
- Prefer shared script invocations from root `package.json` over duplicated shell logic.

## ANTI-PATTERNS

- Do not bypass verification by weakening required workflow jobs.
- Do not add long-running ad-hoc shell logic when existing scripts already exist.
- Do not embed secrets, tokens, or account identifiers directly in workflow files.
- Do not create overlapping deploy workflows with ambiguous ownership.

## NOTES

- Key workflows include `ci.yml`, deploy (`production`, `staging`, `verify`, `monitoring`, `rollback`), `auto-merge*.yml`, `labeler.yml`, and `stale.yml`.
- Validate workflow edits with repository standards before merging because this directory is a high-blast-radius domain.
