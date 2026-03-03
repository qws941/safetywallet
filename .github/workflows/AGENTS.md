# AGENTS: .GITHUB/WORKFLOWS

## SCOPE DELTA

- Workflow-file inventory + coupling notes only.
- Parent `.github/AGENTS.md` owns top-level config scope.

## WORKFLOW INVENTORY (16)

- `auto-merge-dependabot.yml` - `Auto-merge Dependabot`
- `auto-merge.yml` - `Auto Merge`
- `ci.yml` - `CI`
- `codex-auto-issue.yml` - `Codex Auto-Issue`
- `codex-triage.yml` - `Codex Triage`
- `commitlint.yml` - `Commitlint`
- `deploy-monitoring.yml` - `Deployment Monitoring`
- `e2e-auto-issue.yml` - `E2E Failure Issue`
- `e2e-nightly.yml` - `E2E Nightly`
- `labeler.yml` - `Auto-label PRs`
- `lock-threads.yml` - `Lock Threads`
- `pr-size.yml` - `PR Size`
- `release-drafter.yml` - `Release Drafter`
- `ssl-fix.yml` - `SSL Diagnostic & Fix`
- `stale.yml` - `Stale issue/PR cleanup`
- `welcome.yml` - `Welcome`

## FLOW LINKS

- Production deploy uses Cloudflare Git integration (push to `master`).
- `ci.yml` is the primary monorepo verify gate.
- `deploy-monitoring.yml` runs post-CI endpoint health + incident upsert/close.
- Nightly and auto-issue workflows capture E2E failure automation.

## MODULE RULES

- SHA-pin all action `uses:` entries (no mutable tags).
- Keep workflow `name:` values stable when referenced by automation.
- Keep monitoring/incident workflow path intact.
- Keep local manual deploy logic out of workflows.

## ANTI-DRIFT

- No stale workflow names/counts.
- No references to removed deploy workflows.
- No unpinned action tags introduced.
