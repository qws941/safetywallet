# AGENTS: SCRIPTS

## SCOPE DELTA

- Operational/dev tooling under `scripts/` only.
- Keep this file synced to real script inventory.

## INVENTORY (CURRENT)

- Directory files: 12 total (including this `AGENTS.md`).
- Operational files: 11.

## OPERATIONAL FILE SET (11)

- `build-static.go`
- `check-anti-patterns.go`
- `check-wrangler-sync.js`
- `create-cf-token.go`
- `create-test-user.sql`
- `create-test-user.ts`
- `git-preflight.go`
- `hash-admin-password.ts`
- `lint-naming.js`
- `migrate-s4-enums.sql`
- `verify.go`

## MODULE RULES

- Go-first policy for operational scripts.
- Node.js exception allowed for ecosystem-tied validators/hooks/linters.
- Keep CI-facing scripts deterministic, non-interactive, and exit-code strict.
- Keep secret values from env/flags only; never hardcode credentials.
- Keep generated artifact paths explicit (`create-test-user.sql` flow).

## SCRIPT ROLE SNAPSHOT

- `verify.go`: umbrella verification runner.
- `git-preflight.go`: push-readiness gate.
- `check-anti-patterns.go`: staged-content guardrail.
- `check-wrangler-sync.js`: wrangler consistency checker.
- `lint-naming.js`: monorepo naming-policy validator.
- SQL/TS helpers: test-user + enum-migration support.

## ANTI-DRIFT

- No stale file list/count.
- No local-path assumptions in CI scripts.
- No plaintext token/password defaults.
