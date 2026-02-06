# CI/CD Enhancement for SafetyWallet

## TL;DR

> **Quick Summary**: Modernize SafetyWallet CI/CD pipeline with proper caching, D1-compatible testing, admin-app Pages deployment, optimized R2 uploads, staging environment, and rollback capabilities.
>
> **Deliverables**:
>
> - Refactored `.github/workflows/ci.yml` with caching and miniflare tests
> - New `.github/workflows/deploy-staging.yml` for develop branch
> - Updated `.github/workflows/deploy.yml` with admin-app Pages, parallel R2, rollback
> - Removed Hyperdrive placeholder from `apps/api-worker/wrangler.toml`
> - Path-based conditional deployment logic
>
> **Estimated Effort**: Medium (8-12 tasks, ~4-6 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (caching) → Task 3 (test refactor) → Task 6 (deploy refactor)

---

## Context

### Original Request

Enhance CI/CD for SafetyWallet Cloudflare-native stack addressing:

- Missing admin-app deployment
- Slow R2 uploads
- No caching
- Test/prod database mismatch
- Missing staging environment
- No rollback capability

### Interview Summary

**Key Discussions**:

- Notifications: None needed (GitHub Actions logs only)
- Staging trigger: `develop` branch push → auto deploy staging
- Worker-app: Keep R2 deployment, optimize with parallelization
- Hyperdrive: REMOVE placeholder code entirely
- Tests: Miniflare D1 integration + mock KV
- Rollback: API worker + Pages for admin-app (no R2/DB rollback)

**Research Findings**:

- Wrangler has no native bulk R2 upload; use AWS CLI S3 sync or GNU parallel
- Miniflare via `wrangler d1 migrations apply --local` + `unstable_dev`
- Pages staging via branch aliases: `develop.<project>.pages.dev`
- Path filtering: `on.push.paths` in workflow YAML

### Metis Review (Self-Analysis)

**Identified Gaps** (addressed):

- AWS CLI requires R2 API credentials → Added secrets setup task
- Rollback commands need documentation → Included in acceptance criteria
- Path patterns need testing → Included verification scenarios

---

## Work Objectives

### Core Objective

Transform the current fragile CI/CD into a robust, cached, properly-tested pipeline with staging environment and rollback capabilities.

### Concrete Deliverables

- `.github/workflows/ci.yml` - Refactored with caching, miniflare tests
- `.github/workflows/deploy.yml` - Production deploy with admin-app, parallel R2
- `.github/workflows/deploy-staging.yml` - NEW staging workflow
- `apps/api-worker/wrangler.toml` - Hyperdrive removed
- `apps/api-worker/src/lib/fas-client.ts` - Hyperdrive references removed (if exists)

### Definition of Done

- [ ] `git push origin develop` → staging deploys automatically
- [ ] `git push origin main` → production deploys with all 3 apps
- [ ] CI tests pass using miniflare D1 (no Postgres service)
- [ ] npm/turbo caches restore on subsequent runs
- [ ] `wrangler rollback` documented and tested

### Must Have

- GitHub Actions npm caching via `setup-node`
- Turbo cache persistence across runs
- Miniflare-based D1 testing (no Postgres)
- Admin-app deployment to Cloudflare Pages
- R2 upload parallelization (either AWS CLI sync or GNU parallel)
- Staging environment on `develop` branch
- API worker rollback capability
- Path-based conditional deployment

### Must NOT Have (Guardrails)

- ❌ No Slack/Discord notifications (explicitly excluded)
- ❌ No database migration rollback (too risky, out of scope)
- ❌ No R2 versioning/rollback (not requested)
- ❌ No blue-green or canary deployments (over-engineering)
- ❌ No Docker/container-based testing (use miniflare native)
- ❌ No changes to application code beyond Hyperdrive removal

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: NO (current tests use Postgres, needs refactor)
- **Automated tests**: YES (integration tests with miniflare)
- **Framework**: vitest or bun test (to be determined by executor)

### Agent-Executed QA Scenarios (MANDATORY)

All tasks include specific QA scenarios executed by the agent using:

- **Bash**: For workflow syntax validation, git operations
- **GitHub API**: For checking workflow runs, deployments
- **Playwright**: For verifying deployed apps (staging/prod URLs)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Foundation):
├── Task 1: Add GitHub Actions caching
├── Task 2: Remove Hyperdrive placeholder
└── Task 8: Add path-based filtering logic

Wave 2 (After Wave 1 - Test & Staging):
├── Task 3: Refactor tests to use miniflare D1
├── Task 4: Create staging workflow
└── Task 5: Add R2 credentials secrets documentation

Wave 3 (After Wave 2 - Production Deploy):
├── Task 6: Refactor deploy.yml with admin-app + parallel R2
└── Task 7: Add rollback capability

Critical Path: Task 1 → Task 3 → Task 6
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 3, 6   | 2, 8                 |
| 2    | None       | 6      | 1, 8                 |
| 3    | 1          | 6      | 4, 5                 |
| 4    | 1          | None   | 3, 5                 |
| 5    | None       | 6      | 3, 4                 |
| 6    | 2, 3, 5    | 7      | None                 |
| 7    | 6          | None   | None                 |
| 8    | None       | 4, 6   | 1, 2                 |

### Agent Dispatch Summary

| Wave | Tasks   | Recommended Dispatch               |
| ---- | ------- | ---------------------------------- |
| 1    | 1, 2, 8 | 3 parallel agents (quick category) |
| 2    | 3, 4, 5 | 3 parallel agents after Wave 1     |
| 3    | 6, 7    | Sequential (6 then 7)              |

---

## TODOs

### Wave 1: Foundation (No Dependencies)

- [ ] 1. Add GitHub Actions Caching (npm + Turbo)

  **What to do**:
  - Add `cache: 'npm'` to all `actions/setup-node@v4` steps in `ci.yml`
  - Add Turbo cache persistence using `actions/cache@v4`
  - Ensure cache key includes `package-lock.json` hash
  - Remove redundant `npm ci` calls where cache restores

  **Must NOT do**:
  - Don't change Node version (keep v20)
  - Don't add pnpm/bun (stay with npm)
  - Don't modify build scripts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file YAML edit, well-documented pattern
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for workflow change
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser testing needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 8)
  - **Blocks**: Tasks 3, 4, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `.github/workflows/ci.yml:15-20` - Current setup-node configuration to modify

  **External References**:
  - GitHub Docs: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
  - setup-node cache: https://github.com/actions/setup-node#caching-global-packages-data

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Workflow YAML is valid syntax
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run: python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
      2. Assert: Exit code 0 (valid YAML)
    Expected Result: No syntax errors
    Evidence: Command output captured

  Scenario: Cache configuration present
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run: grep -c "cache: 'npm'" .github/workflows/ci.yml
      2. Assert: Count >= 1
      3. Run: grep -A5 "actions/cache@v4" .github/workflows/ci.yml
      4. Assert: Contains ".turbo" in path
    Expected Result: Both npm and turbo caching configured
    Evidence: grep output

  Scenario: Dry-run workflow validation
    Tool: Bash
    Preconditions: act CLI installed (optional)
    Steps:
      1. Run: act -n -W .github/workflows/ci.yml 2>&1 || true
      2. Assert: No "error" in output (warnings OK)
    Expected Result: Workflow parses correctly
    Evidence: act output (if available)
  ```

  **Commit**: YES
  - Message: `ci: add npm and turbo caching to reduce build times`
  - Files: `.github/workflows/ci.yml`
  - Pre-commit: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`

---

- [ ] 2. Remove Hyperdrive Placeholder from wrangler.toml

  **What to do**:
  - Remove `[[hyperdrive]]` block from `apps/api-worker/wrangler.toml` (around line 67)
  - Search for any FAS_HYPERDRIVE references in `apps/api-worker/src/` and remove/comment
  - Update type definitions if Hyperdrive is in `Env` interface

  **Must NOT do**:
  - Don't remove other D1/R2/KV bindings
  - Don't modify FAS logic if it exists (just remove Hyperdrive connection)
  - Don't remove FAS feature entirely (may use different connection later)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config removal + grep-based code search
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for config change
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 8)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `apps/api-worker/wrangler.toml:67` - Hyperdrive block to remove
  - `apps/api-worker/wrangler.toml:1-66` - Other bindings to preserve

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Hyperdrive block removed from wrangler.toml
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run: grep -c "hyperdrive" apps/api-worker/wrangler.toml || echo "0"
      2. Assert: Count = 0
      3. Run: grep -c "PLACEHOLDER_HYPERDRIVE_ID" apps/api-worker/wrangler.toml || echo "0"
      4. Assert: Count = 0
    Expected Result: No hyperdrive references
    Evidence: grep output

  Scenario: Other bindings preserved
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run: grep "d1_databases" apps/api-worker/wrangler.toml
      2. Assert: D1 binding exists
      3. Run: grep "r2_buckets" apps/api-worker/wrangler.toml
      4. Assert: R2 binding exists
    Expected Result: D1 and R2 still configured
    Evidence: grep output

  Scenario: No dangling Hyperdrive references in code
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run: grep -r "FAS_HYPERDRIVE\|hyperdrive" apps/api-worker/src/ || echo "none"
      2. Assert: Output is "none" or only comments
    Expected Result: No active Hyperdrive usage
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `chore(api): remove unused Hyperdrive placeholder`
  - Files: `apps/api-worker/wrangler.toml`, `apps/api-worker/src/**` (if changes)
  - Pre-commit: `grep -c "PLACEHOLDER" apps/api-worker/wrangler.toml || true` → should be 0

---

- [ ] 8. Add Path-Based Conditional Deployment Logic

  **What to do**:
  - Create reusable path filter patterns for each app
  - Document which paths trigger which deployments
  - Prepare YAML snippets for `on.push.paths` configuration
  - This is preparation for Tasks 4 and 6 which will use these patterns

  **Must NOT do**:
  - Don't modify workflows yet (Tasks 4 and 6 do that)
  - Don't create overly complex path patterns
  - Don't filter out shared packages (they should trigger all)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation/planning task
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - All: This is a planning artifact

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - Project structure in `AGENTS.md` - app and package locations

  **External References**:
  - GitHub path filter docs: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onpushpull_requestpaths

  **Path Filter Matrix** (to be created):

  ```yaml
  # API Worker deploys when:
  api-worker-paths:
    - "apps/api-worker/**"
    - "packages/database/**"
    - "packages/types/**"
    - ".github/workflows/deploy*.yml"

  # Worker App deploys when:
  worker-app-paths:
    - "apps/worker-app/**"
    - "packages/ui/**"
    - "packages/types/**"

  # Admin App deploys when:
  admin-app-paths:
    - "apps/admin-app/**"
    - "packages/ui/**"
    - "packages/types/**"
  ```

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Path filter documentation created
    Tool: Bash
    Preconditions: Task completed
    Steps:
      1. Create a comment block or separate file with path patterns
      2. Verify patterns cover all apps
      3. Verify shared packages trigger appropriate apps
    Expected Result: Clear documentation of path patterns
    Evidence: Created file/comment content

  Scenario: Patterns are valid glob syntax
    Tool: Bash
    Preconditions: Patterns documented
    Steps:
      1. Test each pattern manually: ls apps/api-worker/ should match 'apps/api-worker/**'
      2. Verify no typos in package names
    Expected Result: All patterns syntactically valid
    Evidence: ls command outputs
  ```

  **Commit**: NO (documentation only, will be committed with Task 4 or 6)

---

### Wave 2: Test & Staging (After Wave 1)

- [ ] 3. Refactor Tests to Use Miniflare D1

  **What to do**:
  - Remove Postgres and Redis service containers from `ci.yml` test job
  - Add `wrangler d1 migrations apply safework2-db --local` step before tests
  - Update test configuration to use `unstable_dev` from wrangler
  - Create/update test setup file for miniflare environment
  - Mock KV namespace for session tests (if any)

  **Must NOT do**:
  - Don't add Docker/container dependencies
  - Don't create a separate test database config (use --local flag)
  - Don't modify production migrations

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex refactoring of test infrastructure
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commits for test changes
  - **Skills Evaluated but Omitted**:
    - `playwright`: Unit/integration tests, not E2E browser

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (needs caching first)

  **References**:

  **Pattern References**:
  - `.github/workflows/ci.yml:50-80` - Current test job with Postgres/Redis
  - `apps/api-worker/wrangler.toml` - D1 database configuration

  **External References**:
  - Miniflare D1 docs: https://developers.cloudflare.com/workers/testing/miniflare/
  - unstable_dev API: https://developers.cloudflare.com/workers/wrangler/api/#unstable_dev

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Postgres/Redis services removed from CI
    Tool: Bash
    Preconditions: ci.yml edited
    Steps:
      1. Run: grep -c "postgres:" .github/workflows/ci.yml || echo "0"
      2. Assert: Count = 0
      3. Run: grep -c "redis:" .github/workflows/ci.yml || echo "0"
      4. Assert: Count = 0
    Expected Result: No container services in test job
    Evidence: grep output

  Scenario: Miniflare D1 setup present
    Tool: Bash
    Preconditions: ci.yml edited
    Steps:
      1. Run: grep "d1 migrations apply.*--local" .github/workflows/ci.yml
      2. Assert: Command found
    Expected Result: Local D1 migration step exists
    Evidence: grep output

  Scenario: Tests run locally with miniflare
    Tool: Bash
    Preconditions: Test refactored
    Steps:
      1. Run: cd apps/api-worker && npx wrangler d1 migrations apply safework2-db --local
      2. Assert: Exit code 0
      3. Run: npm test --if-present
      4. Assert: Tests pass or skip (not fail on missing Postgres)
    Expected Result: Tests don't require external database
    Evidence: Command outputs
  ```

  **Commit**: YES
  - Message: `test: migrate from Postgres to miniflare D1 for CI testing`
  - Files: `.github/workflows/ci.yml`, test setup files
  - Pre-commit: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`

---

- [ ] 4. Create Staging Deployment Workflow

  **What to do**:
  - Create `.github/workflows/deploy-staging.yml`
  - Trigger on `develop` branch push
  - Deploy API worker with `--env staging` (if env exists) or same prod config
  - Deploy worker-app to Pages staging branch alias
  - Deploy admin-app to Pages staging branch alias
  - Use path filters from Task 8

  **Must NOT do**:
  - Don't create separate Cloudflare projects (use branch aliases)
  - Don't add notifications
  - Don't deploy to production URLs

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: New workflow file, follows existing patterns
  - **Skills**: [`git-master`]
    - `git-master`: New file commit
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser testing in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 8

  **References**:

  **Pattern References**:
  - `.github/workflows/deploy.yml` - Existing production deploy pattern
  - `apps/worker-app/wrangler.toml` - Pages configuration

  **External References**:
  - Pages branch aliases: https://developers.cloudflare.com/pages/configuration/preview-deployments/

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Staging workflow file created and valid
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: test -f .github/workflows/deploy-staging.yml
      2. Assert: File exists
      3. Run: python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-staging.yml'))"
      4. Assert: Valid YAML
    Expected Result: Workflow file exists and is valid
    Evidence: Command outputs

  Scenario: Triggers on develop branch
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: grep -A3 "on:" .github/workflows/deploy-staging.yml
      2. Assert: Contains "develop" branch
      3. Run: grep "branches:" .github/workflows/deploy-staging.yml
      4. Assert: Only develop, not main
    Expected Result: Correct branch trigger
    Evidence: grep output

  Scenario: Deploys all three apps
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: grep -c "wrangler deploy\|wrangler pages deploy" .github/workflows/deploy-staging.yml
      2. Assert: Count >= 3 (api-worker + 2 pages apps)
    Expected Result: All apps have deploy steps
    Evidence: grep count
  ```

  **Commit**: YES
  - Message: `ci: add staging deployment workflow for develop branch`
  - Files: `.github/workflows/deploy-staging.yml`
  - Pre-commit: YAML validation

---

- [ ] 5. Document R2 Credentials Setup for AWS CLI

  **What to do**:
  - Document how to create R2 API token with S3 compatibility
  - List required GitHub secrets: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `CF_ACCOUNT_ID`
  - Add setup instructions to project README or docs/
  - Verify secrets are referenced correctly in deploy workflows

  **Must NOT do**:
  - Don't commit actual credentials
  - Don't create the secrets (user must do this in GitHub UI)
  - Don't modify application code

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation task
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - All code skills: This is documentation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **External References**:
  - R2 S3 API: https://developers.cloudflare.com/r2/api/s3/tokens/

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Documentation created
    Tool: Bash
    Preconditions: Task completed
    Steps:
      1. Run: find docs/ -name "*r2*" -o -name "*deploy*" | head -1
      2. Assert: Documentation file exists
      3. Run: grep "R2_ACCESS_KEY_ID" docs/*.md || grep "R2_ACCESS_KEY_ID" README.md
      4. Assert: Secret name documented
    Expected Result: Setup instructions exist
    Evidence: File content

  Scenario: All required secrets listed
    Tool: Bash
    Preconditions: Documentation created
    Steps:
      1. Verify R2_ACCESS_KEY_ID mentioned
      2. Verify R2_SECRET_ACCESS_KEY mentioned
      3. Verify CF_ACCOUNT_ID mentioned
      4. Verify CLOUDFLARE_API_TOKEN mentioned
    Expected Result: All 4 secrets documented
    Evidence: grep outputs
  ```

  **Commit**: YES
  - Message: `docs: add R2 credentials setup guide for CI/CD`
  - Files: `docs/deployment.md` or `README.md`
  - Pre-commit: None

---

### Wave 3: Production Deploy (After Wave 2)

- [ ] 6. Refactor deploy.yml with Admin-App + Parallel R2

  **What to do**:
  - Add admin-app Cloudflare Pages deployment step
  - Replace R2 shell loop with AWS CLI `s3 sync` or GNU `parallel`
  - Add path-based conditional jobs (using patterns from Task 8)
  - Add proper error handling (set -e, trap)
  - Add deployment summary output

  **Must NOT do**:
  - Don't remove API worker deployment
  - Don't remove worker-app R2 deployment (optimize, don't replace)
  - Don't add notifications
  - Don't change production URLs

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex workflow refactoring with multiple changes
  - **Skills**: [`git-master`]
    - `git-master`: Careful commit of production workflow
  - **Skills Evaluated but Omitted**:
    - `playwright`: Verification is CLI-based

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Wave 2)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3, 5

  **References**:

  **Pattern References**:
  - `.github/workflows/deploy.yml` - Current production deploy (entire file)
  - Task 8 output - Path filter patterns

  **External References**:
  - AWS CLI S3 sync: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/sync.html
  - wrangler pages deploy: https://developers.cloudflare.com/workers/wrangler/commands/#pages

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Admin-app deployment added
    Tool: Bash
    Preconditions: deploy.yml edited
    Steps:
      1. Run: grep -c "admin-app" .github/workflows/deploy.yml
      2. Assert: Count >= 2 (build + deploy mentions)
      3. Run: grep "wrangler pages deploy" .github/workflows/deploy.yml | grep -c "admin"
      4. Assert: Admin pages deploy exists
    Expected Result: Admin-app has deployment step
    Evidence: grep outputs

  Scenario: R2 upload uses parallel/sync
    Tool: Bash
    Preconditions: deploy.yml edited
    Steps:
      1. Run: grep -E "aws s3 sync|parallel|xargs -P" .github/workflows/deploy.yml
      2. Assert: One of these patterns found
      3. Run: grep -c "for.*wrangler r2 object put" .github/workflows/deploy.yml || echo "0"
      4. Assert: Old loop pattern count = 0
    Expected Result: Parallel upload, no serial loop
    Evidence: grep outputs

  Scenario: Error handling present
    Tool: Bash
    Preconditions: deploy.yml edited
    Steps:
      1. Run: grep "set -e\|set -o errexit" .github/workflows/deploy.yml
      2. Assert: Error handling found in bash steps
    Expected Result: Scripts fail on error
    Evidence: grep output

  Scenario: Workflow YAML valid
    Tool: Bash
    Preconditions: deploy.yml edited
    Steps:
      1. Run: python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"
      2. Assert: Exit code 0
    Expected Result: Valid YAML syntax
    Evidence: Command output
  ```

  **Commit**: YES
  - Message: `ci: add admin-app Pages deploy, optimize R2 upload with parallel sync`
  - Files: `.github/workflows/deploy.yml`
  - Pre-commit: YAML validation

---

- [ ] 7. Add Rollback Capability

  **What to do**:
  - Document `wrangler rollback` command for API worker
  - Document Pages rollback via Cloudflare dashboard or `wrangler pages deployment rollback`
  - Add manual dispatch workflow for rollback (optional but recommended)
  - Create rollback runbook in docs/

  **Must NOT do**:
  - Don't implement database rollback
  - Don't implement R2 rollback
  - Don't automate rollback triggers (manual only)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation + simple workflow addition
  - **Skills**: [`git-master`]
    - `git-master`: Commit documentation
  - **Skills Evaluated but Omitted**:
    - `ultrabrain`: Simple task, not complex logic

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Task 6

  **References**:

  **External References**:
  - wrangler rollback: https://developers.cloudflare.com/workers/wrangler/commands/#rollback
  - Pages deployments: https://developers.cloudflare.com/pages/configuration/deployments/

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Rollback documentation created
    Tool: Bash
    Preconditions: Task completed
    Steps:
      1. Run: find docs/ -name "*rollback*" | head -1
      2. Assert: Documentation file exists OR section in existing doc
      3. Run: grep -i "wrangler rollback" docs/*.md
      4. Assert: Command documented
    Expected Result: Rollback instructions exist
    Evidence: File content

  Scenario: Manual dispatch workflow (if created)
    Tool: Bash
    Preconditions: Optional workflow created
    Steps:
      1. Run: grep "workflow_dispatch" .github/workflows/rollback.yml 2>/dev/null || echo "skipped"
      2. If exists, verify inputs for deployment ID
    Expected Result: Manual trigger available (optional)
    Evidence: grep output

  Scenario: Both Worker and Pages rollback documented
    Tool: Bash
    Preconditions: Documentation created
    Steps:
      1. Run: grep -i "worker.*rollback\|rollback.*worker" docs/*.md
      2. Assert: Worker rollback mentioned
      3. Run: grep -i "pages.*rollback\|rollback.*pages" docs/*.md
      4. Assert: Pages rollback mentioned
    Expected Result: Both rollback types covered
    Evidence: grep outputs
  ```

  **Commit**: YES
  - Message: `docs: add rollback runbook for API worker and Pages deployments`
  - Files: `docs/rollback.md`, optionally `.github/workflows/rollback.yml`
  - Pre-commit: None

---

## Commit Strategy

| After Task | Message                                     | Files                   | Verification            |
| ---------- | ------------------------------------------- | ----------------------- | ----------------------- |
| 1          | `ci: add npm and turbo caching`             | ci.yml                  | YAML valid              |
| 2          | `chore(api): remove Hyperdrive placeholder` | wrangler.toml, src/\*\* | grep no PLACEHOLDER     |
| 3          | `test: migrate to miniflare D1`             | ci.yml, test files      | YAML valid, no postgres |
| 4          | `ci: add staging workflow`                  | deploy-staging.yml      | YAML valid              |
| 5          | `docs: R2 credentials setup`                | docs/deployment.md      | secrets documented      |
| 6          | `ci: admin-app deploy + parallel R2`        | deploy.yml              | YAML valid              |
| 7          | `docs: rollback runbook`                    | docs/rollback.md        | commands documented     |
| 8          | (grouped with 4 or 6)                       | -                       | -                       |

---

## Success Criteria

### Verification Commands

```bash
# All workflow files valid YAML
for f in .github/workflows/*.yml; do python3 -c "import yaml; yaml.safe_load(open('$f'))"; done

# No Hyperdrive references
grep -r "PLACEHOLDER_HYPERDRIVE_ID" apps/api-worker/ && echo "FAIL" || echo "PASS"

# No Postgres in CI
grep -c "postgres:" .github/workflows/ci.yml  # Should be 0

# Admin-app in deploy
grep -c "admin-app" .github/workflows/deploy.yml  # Should be >= 2

# Staging workflow exists
test -f .github/workflows/deploy-staging.yml && echo "PASS"
```

### Final Checklist

- [ ] All workflow YAML files parse without errors
- [ ] `develop` branch push triggers staging deploy
- [ ] `main` branch push triggers production deploy with all 3 apps
- [ ] CI tests run without Postgres/Redis services
- [ ] npm cache restores on second CI run (check Actions logs)
- [ ] Turbo cache shows "cache hit" on unchanged packages
- [ ] R2 upload uses parallel method (no serial loop)
- [ ] Hyperdrive placeholder completely removed
- [ ] Rollback commands documented
- [ ] All required secrets documented (not committed!)
