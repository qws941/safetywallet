# AGENTS: .GITHUB/WORKFLOWS

## PURPOSE

- Workflow-level inventory, coupling notes, and CI automation drift controls.
- Child scope of `.github`; no top-level metadata duplication.

## INVENTORY

- `AGENTS.md` — workflow governance file.
- `ci.yml` — primary CI verification pipeline.
- `ci-notify-failure.yml` — CI failure fan-out notifications.
- `deploy-monitoring.yml` — post-CI deployment monitoring lifecycle.
- `commitlint.yml` — commit/PR title lint policy.
- `labeler.yml` — PR path label sync.
- `issue-label.yml` — issue form label automation.
- `issue-lifecycle.yml` — issue state automation.
- `release-drafter.yml` — release notes draft automation.
- `stale.yml` / `lock-threads.yml` / `welcome.yml` — community hygiene automation.
- `pr-size.yml` / `branch-cleanup.yml` / `auto-merge.yml` / `auto-approve-runs.yml` — PR lifecycle automation.
- `dependabot-auto-fix.yml` — Dependabot remediation automation.
- `ssl-fix.yml` — manual SSL remediation helper.
- `codex-approve-runs.yml` / `codex-auto-issue.yml` / `codex-issue-timeout.yml` / `codex-pr-normalize.yml` / `codex-pr-review.yml` / `codex-triage.yml` — Codex automation set.
- Workflow file count: 23 YAML workflows + this `AGENTS.md` = 24 files.

## CONVENTIONS

- SHA-pin every action in `uses:` with version comment.
- Keep workflow `name:` stable when used by `workflow_run`/status checks.
- Keep `ci.yml` as upstream gate for notify/monitoring workflows.
- Keep permissions scoped minimally per workflow.
- Keep YAML file names kebab-case and purpose-specific.

## ANTI-PATTERNS

- Mutable action tags (`@v*`, `@main`) without SHA pinning.
- Renaming workflow `name:` fields without downstream update.
- Stale workflow inventory after add/remove.
- Privileged default token scopes when narrower scopes suffice.

## DRIFT GUARDS

- Confirm directory remains 24 entries with 23 `.yml` workflows.
- Confirm `ci-notify-failure.yml` and `deploy-monitoring.yml` still align to CI trigger contracts.
- Confirm Codex workflow set list matches on-disk filenames.
- Confirm parent `.github/AGENTS.md` counts match this file.
