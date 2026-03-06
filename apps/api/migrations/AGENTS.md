# AGENTS: MIGRATIONS

## PURPOSE

Append-only D1 schema history for `apps/api`.
This directory tracks SQL migration lineage plus Drizzle metadata snapshots.

## FILE INVENTORY

| Group              | Count | Files                                                                                                 |
| ------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| SQL migrations     | 27    | `0000_lovely_jocasta.sql` through `0026_add_tbm_meeting_minutes.sql`                                  |
| Drizzle meta files | 4     | `meta/_journal.json`, `meta/0000_snapshot.json`, `meta/0012_snapshot.json`, `meta/0017_snapshot.json` |

## SQL SET (CURRENT)

`0000_lovely_jocasta.sql`, `0001_add_user_pii_encrypted.sql`, `0002_add_false_report_restrictions.sql`, `0003_add_disputes.sql`, `0003_add_remaining_tables.sql`, `0004_dual_axis_state_machine.sql`, `0005_add_action_priority_description.sql`, `0006_add_missing_user_columns.sql`, `0007_add_api_metrics.sql`, `0008_add_push_subscriptions.sql`, `0009_drop_dead_pii_columns.sql`, `0010_add_attendance_unique_constraint.sql`, `0012_data_integrity_schema_fixes.sql`, `0013_add_quiz_types_education_source.sql`, `0014_add_media_type_to_post_images.sql`, `0015_add_missing_indexes.sql`, `0016_seed_education_contents.sql`, `0017_illegal_norman_osborn.sql`, `0018_add_view_count.sql`, `0019_unmask_user_names.sql`, `0020_add_image_ai_analysis_table.sql`, `0021_add_education_ai_columns.sql`, `0022_add_tbm_ai_columns.sql`, `0023_add_action_image_ai_columns.sql`, `0024_add_post_ai_classification.sql`, `0025_add_action_ai_comparison.sql`, `0026_add_tbm_meeting_minutes.sql`.

## CONVENTIONS

- Update `src/db/schema.ts` first, then generate migration SQL and meta artifacts.
- Treat committed migrations as immutable history.
- Commit SQL and `meta/` updates together when schema generation runs.
- Preserve historical numbering quirks (duplicate `0003`, missing `0011`) as lineage.

## ANTI-PATTERNS

- Do not rewrite historical SQL to retrofit production history.
- Do not hand-edit `_journal.json` except controlled conflict resolution.
- Do not place runtime application logic in migration SQL files.
- Do not infer continuity from numbering; rely on journal ordering.
