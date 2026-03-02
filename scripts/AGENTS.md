# AGENTS: SCRIPTS

## DELTA SCOPE

Repository utility scripts in `scripts/` only.

## CURRENT FILE SET

- `build-static.go`
- `check-anti-patterns.go`
- `check-wrangler-sync.js`
- `create-cf-token.go`
- `create-test-user.ts`
- `git-preflight.go`
- `hash-admin-password.ts`
- `lint-naming.js`
- `verify.go`

## FILE INTENT SNAPSHOT

- Anti-pattern commit guard for staged files.
- Root/app wrangler binding sync guard.
- Cloudflare token bootstrap helper (manual/operator use).
- Test-user SQL generator (`scripts/create-test-user.sql` output).
- Git remote/auth/push preflight checker.
- Admin password PBKDF2 hash generator.
- Workspace package naming linter.
- Static export build+copy helper (legacy).
- Full project verification (build, lint, typecheck, tests).

## MODULE RULES

- Keep secret inputs from env only.
- Keep scripts idempotent where practical.
- Keep CI-called scripts non-interactive and deterministic.
- Keep output paths explicit when scripts generate artifacts.
- Keep Go scripts standalone (`//go:build ignore`, no go.mod).

## ANTI-DRIFT

- Do not list deleted helper files in this doc.
- Do not assume local-only paths in CI guard scripts.
- Do not add plaintext credentials or tokens to script defaults.
