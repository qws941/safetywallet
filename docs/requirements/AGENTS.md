# AGENTS: REQUIREMENTS

## OVERVIEW

**Scope:** Product requirement definitions, checklist verification, and requirement specification docs.

`docs/requirements/` contains requirement truth for SafetyWallet implementation and verification. This directory defines what must exist in product behavior and how implementation evidence is tracked.

## STRUCTURE

```
requirements/
├── SafetyWallet_PRD_v1.1.md                  # Baseline PRD (master requirement set)
├── REQUIREMENTS_CHECKLIST.md                 # Canonical implementation gap/status tracker
├── ELK_INDEX_PREFIX_REQUIREMENTS.md          # Focused requirements for ELK index prefix behavior
├── Phase3_UI_Simplification_PRD.md           # Focused UI simplification requirement spec
└── SafetyWallet_Implementation_Plan_v1.0.md  # Deprecated legacy architecture plan
```

## WHERE TO LOOK

| Task                          | Location                           | Notes                                                  |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------ |
| Confirm baseline requirement  | `SafetyWallet_PRD_v1.1.md`         | Start point for product behavior expectations          |
| Verify implementation status  | `REQUIREMENTS_CHECKLIST.md`        | Canonical pass/fail and evidence reference             |
| Check ELK logging constraints | `ELK_INDEX_PREFIX_REQUIREMENTS.md` | Configurable prefix requirements + acceptance criteria |
| Review focused UI phase scope | `Phase3_UI_Simplification_PRD.md`  | UI-specific PRD scope                                  |

## CONVENTIONS

- Parent-first inheritance: repo root `AGENTS.md` defines global policy, `docs/AGENTS.md` defines docs-wide policy, this file defines requirements-specific deltas.
- Requirement docs should be self-contained and avoid duplicating the full PRD across multiple files.
- Prefer checklist-first verification (`REQUIREMENTS_CHECKLIST.md`) before editing or extending requirement docs.
- Keep requirement files domain-focused; avoid repeating full PRD content in each file.
- When conflicts appear, align to checklist/PRD and record updates in the appropriate requirement file.
- Keep requirement language testable (functional requirement, non-functional requirement, acceptance criteria).
- Preserve deprecated docs for historical traceability, but mark them explicitly and avoid treating them as active plan.

## ANTI-PATTERNS

- No requirement drift between checklist and PRD.
- No ambiguous acceptance criteria that cannot be verified by tests, typecheck, or build gates.
- No hidden runtime assumptions not reflected in requirement docs.
- No active implementation decisions based on deprecated `SafetyWallet_Implementation_Plan_v1.0.md`.
- No mixing operations runbook content into requirement docs; keep operational procedures in `docs/cloudflare-operations.md`.
