# AGENTS: DOCS

## OVERVIEW

**Scope:** Documentation source-of-truth, runbooks, and requirement docs.

`docs/` is the canonical documentation surface for product requirements and operations. Use this directory to resolve requirement truth, deployment/rollback procedures, and implementation tracking.

## STRUCTURE

```
docs/
├── README.md                           # Docs index and redirects
├── requirements/                       # PRD, checklist, requirement specs
├── cloudflare-operations.md            # Deploy/rollback/D1 runbook
├── FEATURE_CHECKLIST.md                # Feature execution status tracking
├── REQUIREMENTS_REVIEW.md              # Redirect to canonical checklist
├── deployment.md                       # Redirect to runbook
└── rollback.md                         # Redirect to runbook rollback section
```

## WHERE TO LOOK

| Task                           | Location                                        | Notes                                    |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------- |
| Product requirement baseline   | `requirements/SafetyWallet_PRD_v1.1.md`         | Master product requirement document      |
| Implementation truth/gap check | `requirements/REQUIREMENTS_CHECKLIST.md`        | Canonical verification artifact          |
| UI simplification scope        | `requirements/Phase3_UI_Simplification_PRD.md`  | Focused UI simplification requirement    |
| ELK logging requirements       | `requirements/ELK_INDEX_PREFIX_REQUIREMENTS.md` | Index-prefix behavior and acceptance     |
| Deploy and rollback operations | `cloudflare-operations.md`                      | Single runbook for prod ops              |
| Documentation entry index      | `README.md`                                     | Current vs redirected vs deprecated docs |

## SUBMODULE DOCS

- `requirements/AGENTS.md`: Requirement hierarchy, module ownership, and anti-patterns.

## CONVENTIONS

- Parent-first inheritance: `AGENTS.md` at repo root remains canonical for global rules; this file defines docs-only deltas.
- Child docs are delta-only: `docs/requirements/AGENTS.md` and deeper files must avoid repeating root-level global policy.
- Override precedence is explicit: when child guidance differs, child file wins only for its own subtree.
- Treat `requirements/REQUIREMENTS_CHECKLIST.md` as canonical when other requirement docs disagree.
- Keep legacy docs in place only when explicitly marked deprecated and needed for history.
- Use redirect docs (`deployment.md`, `rollback.md`, `REQUIREMENTS_REVIEW.md`) as pointers, not alternate sources of truth.
- Keep runbook guidance operational and executable (commands, prerequisites, rollback paths).
- Reflect current Cloudflare deployment model (Workers Builds, single-worker runtime) and avoid stale manual deploy instructions.

## ANTI-PATTERNS

- No duplicate source-of-truth claims across multiple requirement files.
- No architecture drift in requirement docs (for example, referencing legacy NestJS/PostgreSQL as active runtime).
- No hidden operational requirements outside runbook/checklist documents.
- No undocumented redirects; if a file is a redirect, say so explicitly in `docs/README.md`.
- No credential values or secret material in docs; reference env/secret names only.
