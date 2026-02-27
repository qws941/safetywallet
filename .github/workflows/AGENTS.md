# AGENTS: .GITHUB/WORKFLOWS

## DELTA SCOPE

Workflow-file specifics only.
Parent `.github/AGENTS.md` covers top-level config ownership.

## CURRENT WORKFLOW FILES

- `ci.yml` (`name: CI`)
- `deploy-monitoring.yml` (`name: Deployment Monitoring`)
- `commitlint.yml` (`name: Commitlint`)
- `pr-size.yml` (`name: PR Size`)
- `auto-merge.yml` (`name: Auto Merge`)
- `auto-merge-dependabot.yml` (`name: Auto-merge Dependabot`)
- `labeler.yml` (`name: Auto-label PRs`)
- `stale.yml` (`name: Stale issue/PR cleanup`)
- `welcome.yml` (`name: Welcome`)
- `lock-threads.yml` (`name: Lock Threads`)
- `release-drafter.yml` (`name: Release Drafter`)
- `ssl-fix.yml` (`name: SSL Diagnostic & Fix`)
- `codex-auto-issue.yml` (`name: Codex Auto-Issue`)
- `codex-triage.yml` (`name: Codex Triage`)

## FLOW LINKS

- Production deploy is handled by Cloudflare Git Integration on push to `master` — no deploy workflow.
- `deploy-monitoring.yml` watches `CI`, `Deploy SafetyWallet`, `Deploy Staging` completion.
- `ci.yml` controls monorepo build/test/e2e gate and Slack notify.

## MODULE RULES

- Keep action pins as commit SHA.
- Keep incident automation path intact in monitoring workflow.
- Keep workflow names stable when referenced by other workflows.

## ANTI-DRIFT

- Do not reintroduce removed workflow files (`deploy-production.yml`, `deploy-verify.yml`) in docs/comments.
- Do not rename workflow `name:` fields without updating dependents.
- Do not move deploy logic into manual local command steps.
