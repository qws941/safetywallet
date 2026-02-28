# AGENTS: MIGRATIONS

## OVERVIEW

**Context:** Drizzle SQL migration history for D1 **Scope:** Ordered migration files and Drizzle metadata snapshots

This directory is the canonical schema-evolution log for the API worker and must stay strictly ordered and journal-consistent.

## STRUCTURE

```
migrations/
├── 0000_*.sql ... 0013_*.sql  # Chronological schema changes
└── meta/
    ├── _journal.json          # Drizzle migration ledger
    └── *_snapshot.json        # Schema snapshots
```

## WHERE TO LOOK

| Task               | Location                           | Notes                                     |
| ------------------ | ---------------------------------- | ----------------------------------------- |
| Add schema change  | `apps/api-worker/src/db/schema.ts` | Update schema first, then generate SQL    |
| Generate migration | `npm run db:generate`              | Produces next numbered SQL + meta updates |
| Apply locally      | `npm run db:migrate`               | Applies SQL to local D1                   |
| Apply production   | `npm run db:migrate:prod`          | Applies SQL to remote D1                  |

## CONVENTIONS

- Treat SQL files as immutable history after they are applied/shared.
- Keep migration order monotonic and filenames deterministic.
- Commit SQL and `meta/` updates together when generated.
- Use Drizzle generation flow from schema changes; avoid hand-authored drift.

## ANTI-PATTERNS

- Do not edit old migrations to retrofit new behavior.
- Do not skip journal/snapshot updates when they change.
- Do not run ad-hoc DDL in production outside migration workflow.
- Do not include data backfills that depend on unstable IDs.
