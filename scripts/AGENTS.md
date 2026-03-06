# Scripts

Operational/developer scripts and one-off migration utilities.

## Inventory

- `AGENTS.md` — local script governance and drift rules.
- `verify.go` — umbrella verifier (lint, type-check, unit tests, build).
- `git-preflight.go` — commit/push readiness checks.
- `check-anti-patterns.go` — scans staged/changed code for forbidden patterns.
- `build-static.go` — static build pipeline helper for worker app assets.
- `create-cf-token.go` — Cloudflare token creation helper.
- `check-wrangler-sync.js` — validates `wrangler.toml` binding parity across root/app configs.
- `lint-naming.js` — monorepo naming policy linter.
- `create-test-user.ts` — emits SQL for test worker user bootstrap.
- `hash-admin-password.ts` — PBKDF2 password hash generator for admin secret provisioning.
- `create-test-user.sql` — generated SQL seed artifact used in local test setup.
- `migrate-s4-enums.sql` — D1 migration script for S4 post state enum normalization.

## Conventions

- Keep operational automation in Go by default.
- JS/TS scripts are allowed only for ecosystem-coupled tooling or utility generation flows.
- CI-executed scripts must be deterministic, non-interactive, and strict on non-zero exits.
- Secrets must be supplied through env vars/flags, never embedded literals.
- Utility scripts that generate artifacts should document output target and overwrite behavior.

## Drift Guards

- No hardcoded local absolute paths in scripts used by CI.
- No plaintext credential defaults in script source.
- No stale script entries in this inventory.
