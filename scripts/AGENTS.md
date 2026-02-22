# AGENTS: SCRIPTS

## OVERVIEW

Utility scripts for data migration, test seeding, and infrastructure tasks.

## STRUCTURE

```
scripts/
├── check-anti-patterns.sh  # Lint for forbidden code patterns
├── check-wrangler-sync.js  # Verify wrangler.toml matches schema
├── create-cf-token.sh      # Generate Cloudflare API tokens
├── create-test-user.ts     # Seed test users (tsx)
├── create-test-user.sql    # Test user SQL template
├── git-preflight.sh        # Git remote/auth/push preflight
├── hash-admin-password.ts  # Hash admin credentials (tsx)
├── import-aceviewer.ts     # Import legacy AceViewer data (tsx)
├── lint-naming.js          # Monorepo naming convention check
├── migrate-s4-enums.sql    # S4 enum migration SQL
├── scaffold-e2e-spec.js    # Generate E2E test scaffolding
└── sync-r2.sh              # Sync R2 bucket contents
```

## CONVENTIONS

- **TypeScript First**: Complex logic in `.ts` (run via `tsx` or `ts-node`).
- **Shell**: Use `.sh` for simple wrappers or CI tasks.
- **SQL**: Store raw queries in `.sql` files for reference/manual execution.

## ANTI-PATTERNS

- **No Production Write**: Scripts should be read-only or strictly dev/test targeted unless explicitly named `migrate-*`.
- **No Hardcoded Creds**: Use env vars.
