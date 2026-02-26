# AGENTS: .GITHUB/WORKFLOWS

## DELTA SCOPE

Workflow-file specifics only.
Parent `.github/AGENTS.md` covers top-level config ownership.

## CURRENT WORKFLOW FILES

- `ci.yml` (`name: CI`)
- `deploy-production.yml` (`name: Deploy SafetyWallet`)
- `deploy-verify.yml` (`name: Deploy Verification`)
- `deploy-monitoring.yml` (`name: Deployment Monitoring`)
- `auto-merge.yml` (`name: Auto Merge`)
- `auto-merge-dependabot.yml` (`name: Auto-merge Dependabot`)
- `labeler.yml` (`name: Auto-label PRs`)
- `stale.yml` (`name: Stale issue/PR cleanup`)
- `ssl-fix.yml` (`name: SSL Diagnostic & Fix`)
- `codex-auto-issue.yml` (`name: Codex Auto-Issue`)
- `codex-triage.yml` (`name: Codex Triage`)

## FLOW LINKS

- `deploy-production.yml` listens to `workflow_run` of `CI` on `master`.
- `deploy-production.yml` calls reusable `deploy-verify.yml`.
- `deploy-monitoring.yml` watches `CI`, `Deploy SafetyWallet`, `Deploy Staging` completion.
- `ci.yml` controls monorepo build/test/e2e gate and Slack notify.

## MODULE RULES

- Keep action pins as commit SHA.
- Keep deploy concurrency strict (`cancel-in-progress: false` for production deploy group).
- Keep production verification smoke-targeted (`@smoke`, selected projects).
- Keep incident automation path intact in monitoring workflow.
- Keep workflow names stable when referenced by other workflows.

## ANTI-DRIFT

- Do not reintroduce removed workflow files in docs/comments.
- Do not rename workflow `name:` fields without updating dependents.
- Do not move deploy logic into manual local command steps.
