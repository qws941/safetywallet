# AGENTS: REQUIREMENTS

## OVERVIEW

**Scope:** Product requirement definitions, checklist verification, and modular requirement decomposition.

`docs/requirements/` contains requirement truth for SafetyWallet implementation and verification. This directory defines what must exist in product behavior and how implementation evidence is tracked.

## STRUCTURE

```
requirements/
├── SafetyWallet_PRD_v1.1.md                  # Baseline PRD (master requirement set)
├── REQUIREMENTS_CHECKLIST.md                 # Canonical implementation gap/status tracker
├── ELK_INDEX_PREFIX_REQUIREMENTS.md          # Focused requirements for ELK index prefix behavior
├── Phase3_UI_Simplification_PRD.md           # Focused UI simplification requirement spec
├── SafetyWallet_Implementation_Plan_v1.0.md  # Deprecated legacy architecture plan
└── modules/
    ├── README.md                             # Module index and usage rules
    ├── 00-overview-and-governance.md
    ├── 01-auth-and-permissions.md
    ├── 02-post-lifecycle-and-admin-ops.md
    ├── 03-points-and-notifications.md
    ├── 04-data-privacy-and-nfr.md
    └── 05-architecture-and-roadmap.md
```

## WHERE TO LOOK

| Task                          | Location                           | Notes                                                  |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------ |
| Confirm baseline requirement  | `SafetyWallet_PRD_v1.1.md`         | Start point for product behavior expectations          |
| Verify implementation status  | `REQUIREMENTS_CHECKLIST.md`        | Canonical pass/fail and evidence reference             |
| Navigate modular requirements | `modules/README.md`                | Domain-sliced requirement navigation                   |
| Check ELK logging constraints | `ELK_INDEX_PREFIX_REQUIREMENTS.md` | Configurable prefix requirements + acceptance criteria |
| Review focused UI phase scope | `Phase3_UI_Simplification_PRD.md`  | UI-specific PRD scope                                  |

## SUBMODULE DOCS

- `modules/AGENTS.md`: Module-level decomposition rules and cross-module dedup guidance.

## CONVENTIONS

- Parent-first inheritance: repo root `AGENTS.md` defines global policy, `docs/AGENTS.md` defines docs-wide policy, this file defines requirements-specific deltas.
- Child module docs should be delta-only and avoid duplicating requirements in full across `modules/*.md`.
- Override precedence is local-first: `modules/AGENTS.md` may refine rules only for `docs/requirements/modules/`.
- Prefer checklist-first verification (`REQUIREMENTS_CHECKLIST.md`) before editing or extending module docs.
- Keep module files domain-focused; avoid repeating full PRD content in each module.
- When conflicts appear, align modules to checklist/PRD and record updates in the appropriate requirement file.
- Keep requirement language testable (functional requirement, non-functional requirement, acceptance criteria).
- Preserve deprecated docs for historical traceability, but mark them explicitly and avoid treating them as active plan.

## ANTI-PATTERNS

- No requirement drift between checklist and modules.
- No ambiguous acceptance criteria that cannot be verified by tests, typecheck, or build gates.
- No hidden runtime assumptions not reflected in requirement docs.
- No active implementation decisions based on deprecated `SafetyWallet_Implementation_Plan_v1.0.md`.
- No mixing operations runbook content into requirement modules; keep operational procedures in `docs/cloudflare-operations.md`.
