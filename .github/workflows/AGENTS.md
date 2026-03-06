# AGENTS: .GITHUB/WORKFLOWS

## SCOPE DELTA

- Own workflow inventory, trigger/coupling notes, and workflow-specific drift guards.
- Parent `.github/AGENTS.md` owns top-level `.github` config inventory.

## WORKFLOW INVENTORY (23)

- `auto-approve-runs.yml` - Auto-approve gated runs
- `auto-merge.yml` - Auto-merge orchestration
- `branch-cleanup.yml` - Branch cleanup on PR close
- `ci-notify-failure.yml` - CI failure notification fan-out
- `ci.yml` - Primary monorepo CI gate
- `codex-approve-runs.yml` - Codex run approval workflow
- `codex-auto-issue.yml` - Codex issue invocation on label
- `codex-issue-timeout.yml` - Codex issue timeout handling
- `codex-pr-normalize.yml` - Codex PR normalization
- `codex-pr-review.yml` - Codex PR review trigger
- `codex-triage.yml` - Codex issue triage
- `commitlint.yml` - Conventional commit/PR title checks
- `dependabot-auto-fix.yml` - Dependabot to Codex automation
- `deploy-monitoring.yml` - Post-CI deployment health + incident lifecycle
- `issue-label.yml` - Issue form-driven label automation
- `issue-lifecycle.yml` - Issue lifecycle automation
- `labeler.yml` - Path-based PR labeling
- `lock-threads.yml` - Auto-lock closed threads
- `pr-size.yml` - PR size labeling
- `release-drafter.yml` - Release notes drafting
- `ssl-fix.yml` - Manual SSL diagnosis/remediation helper
- `stale.yml` - Stale issue/PR cleanup
- `welcome.yml` - First-time contributor welcome

## FLOW LINKS

- `ci.yml` is the primary verify pipeline for lint/typecheck/test/build/guards.
- `ci-notify-failure.yml` and `deploy-monitoring.yml` are downstream `workflow_run` consumers of CI results.
- `codex-*` workflows coordinate issue triage, PR review, and timeout/normalization automation.
- `issue-label.yml` and `labeler.yml` split issue-vs-PR labeling responsibilities.
- Deploy remains Git-ref driven; no direct manual deploy workflow is the source of truth.

## MODULE RULES

- SHA-pin all action `uses:` entries; avoid mutable tags.
- Keep workflow `name:` values stable when downstream automation depends on them.
- Preserve `workflow_run` coupling between CI, notifications, and monitoring.
- Keep workflow behavior repository-accurate (remove stale references quickly).

## ANTI-DRIFT

- No stale workflow names/counts in inventory.
- No references to removed workflows.
- No mutable action tags or unscoped token permissions.
