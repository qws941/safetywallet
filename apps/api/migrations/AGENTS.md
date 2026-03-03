# AGENTS: MIGRATIONS

## PURPOSE

Schema evolution history for D1 used by `apps/api`.
Scope is only migration SQL ordering and Drizzle metadata state.

## FILES/STRUCTURE

- SQL files present: 16 (`0000` through `0015`, with two `0003_*` files, no `0011_*`).
- Current SQL set:
  - `0000_lovely_jocasta.sql`
  - `0001_add_user_pii_encrypted.sql`
  - `0002_add_false_report_restrictions.sql`
  - `0003_add_disputes.sql`
  - `0003_add_remaining_tables.sql`
  - `0004_dual_axis_state_machine.sql`
  - `0005_add_action_priority_description.sql`
  - `0006_add_missing_user_columns.sql`
  - `0007_add_api_metrics.sql`
  - `0008_add_push_subscriptions.sql`
  - `0009_drop_dead_pii_columns.sql`
  - `0010_add_attendance_unique_constraint.sql`
  - `0012_data_integrity_schema_fixes.sql`
  - `0013_add_quiz_types_education_source.sql`
  - `0014_add_media_type_to_post_images.sql`
  - `0015_add_missing_indexes.sql`
- `meta/_journal.json` and snapshots currently: `0000_snapshot.json`, `0012_snapshot.json`.

## CONVENTIONS

- Edit schema in `apps/api/src/db/schema.ts`, then generate migration artifacts.
- Treat existing SQL files as append-only history once shared.
- Keep SQL and `meta/` updates in the same commit when regenerated.
- Preserve file numbering lineage; gaps and duplicate ordinal (`0003`) are historical and intentional.

## ANTI-PATTERNS

- Do not rewrite old SQL to "fix" a released schema state.
- Do not hand-edit `_journal.json` except for conflict resolution with validated replay.
- Do not add runtime app logic or data-seeding scripts in migration SQL files.
- Do not assume sequential numbering means contiguous history (`0011` is absent).
