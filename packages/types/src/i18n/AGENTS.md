# AGENTS: TYPES/I18N

## OVERVIEW

**Context:** Shared localization dictionary contracts **Scope:** Korean translation keys and typed exports used across apps

This directory is the shared localization source for common Korean strings and must maintain stable keys and consistent domain naming.

## WHERE TO LOOK

| Task                      | Location                    | Notes                                            |
| ------------------------- | --------------------------- | ------------------------------------------------ |
| Add/modify strings        | `ko.ts`                     | Keep grouped key sections and naming consistency |
| Export locale bundle      | `index.ts`                  | Re-export canonical locale objects/types         |
| Cross-app usage alignment | `apps/worker-app/src/i18n/` | Keep key names compatible with app consumers     |

## CONVENTIONS

- Use deterministic key naming and section grouping; avoid ad-hoc key sprawl.
- Keep strings user-facing and production-ready (no placeholder copy).
- Preserve backward compatibility for existing keys used in multiple apps.
- Keep this folder logic-less: dictionaries/types only.

## ANTI-PATTERNS

- Do not rename existing keys without migration across all consumers.
- Do not add runtime formatting/parsing utilities here.
- Do not duplicate app-local strings that belong to app-specific i18n layers.
- Do not mix unrelated language catalogs in this folder without explicit structure.
