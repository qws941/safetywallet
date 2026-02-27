# AGENTS: SCRIPTS

## DELTA SCOPE

Repository utility scripts in `scripts/` only.

## CURRENT FILE SET

- `check-anti-patterns.sh`
- `check-wrangler-sync.js`
- `create-cf-token.sh`
- `create-test-user.ts`
- `git-preflight.sh`
- `hash-admin-password.ts`
- `lint-naming.js`
- `sync-r2.sh`
- `verify.sh`

## FILE INTENT SNAPSHOT

- Anti-pattern commit guard for staged files.
- Root/app wrangler binding sync guard.
- Cloudflare token bootstrap helper (manual/operator use).
- Test-user SQL generator (`scripts/create-test-user.sql` output).
- Git remote/auth/push preflight checker.
- Admin password PBKDF2 hash generator.
- Workspace package naming linter.
- R2 static asset sync uploader.
- Full project verification (build, lint, typecheck, tests).

## MODULE RULES

- Keep secret inputs from env only.
- Keep scripts idempotent where practical.
- Keep CI-called scripts non-interactive and deterministic.
- Keep output paths explicit when scripts generate artifacts.
- Keep shell scripts POSIX-safe enough for Ubuntu runners.

## ANTI-DRIFT

- Do not list deleted helper files in this doc.
- Do not assume local-only paths in CI guard scripts.
- Do not add plaintext credentials or tokens to script defaults.
