# AGENTS: .GITHUB/WORKFLOWS

## OVERVIEW

Workflow-level deployment and automation orchestration for SafetyWallet.

## WHERE TO LOOK

| Task               | Workflow                                      | Notes                                       |
| :----------------- | :-------------------------------------------- | :------------------------------------------ |
| CI quality gate    | `ci.yml`                                      | lint/type/test/build and branch protections |
| Full automation    | `full-automation.yml`                         | orchestrates test/deploy/release dispatch   |
| Production deploy  | `deploy-production.yml`                       | triggered by CI success on `master`         |
| Release tagging    | `release-tag.yml`                             | auto/custom semver tag + GitHub release     |
| Staging deploy     | `deploy-staging.yml`                          | push/develop and manual dispatch            |
| Post-deploy verify | `deploy-verify.yml`                           | smoke checks, env health, regressions       |
| Rollback flow      | `deploy-rollback.yml`                         | controlled rollback path                    |
| Deploy monitoring  | `deploy-monitoring.yml`                       | health monitor + notifications              |
| Repo automation    | `labeler.yml`, `stale.yml`, `auto-merge*.yml` | issue/pr maintenance and merge policies     |

## CONVENTIONS

- Keep deploy workflows CI-driven (`workflow_run` from successful CI) instead of direct manual deploy scripts.
- Use explicit branch/env routing (`master` production, `develop` staging) and avoid mixed targets in one job.
- Preserve `concurrency` on deploy workflows; never allow overlapping production deploy jobs.
- Pin and scope credentials to GitHub Secrets/Environments; no inline secrets or dynamic credential echoing.
- Keep verification jobs (`deploy-verify`) as a hard gate after deploy completion.

## ANTI-PATTERNS

- Do not add local/manual deploy commands (`wrangler deploy`) into workflows.
- Do not bypass CI checks with direct production dispatch logic.
- Do not duplicate deploy logic across multiple workflows when reusable flow exists.
- Do not weaken permissions (`write-all`) when job-scoped permissions are sufficient.

## NOTES

- Deployment behavior depends on Cloudflare Git integration and reusable verify jobs.
- When adding new workflow files, update `.github/AGENTS.md` routing table in the same change.
