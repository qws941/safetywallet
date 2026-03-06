# Requirements

Product requirements, PRDs, and verification artifacts.

## Active Inventory

- `AGENTS.md` — local requirements-document governance.
- `REQUIREMENTS_CHECKLIST.md` — execution status source of truth for requirement items.
- `SafetyWallet_PRD_v1.1.md` — baseline product requirement document.
- `Phase3_UI_Simplification_PRD.md` — phase-specific UI simplification scope and constraints.
- `ELK_INDEX_PREFIX_REQUIREMENTS.md` — ELK index naming and ingestion requirements.
- `IMPLEMENTATION_VERIFICATION_CHECKLIST.md` — implementation evidence checklist.
- `REGISTRATION_VERIFICATION_REPORT.md` — registration flow validation report.
- `archived/SafetyWallet_Implementation_Plan_v1.0.md` — legacy plan retained for historical context only.

## Conventions

- Requirement statements must be testable and evidence-backed.
- Status tracking belongs in `REQUIREMENTS_CHECKLIST.md`; avoid duplicate status ledgers.
- PRD updates require explicit note when they diverge from existing checklist status.
- Superseded requirement text should include reason/date context.
- Operational runbook instructions stay in `docs/`, not this subtree.

## Drift Guards

- No active implementation guidance sourced from `archived/` files.
- No duplicated tables that disagree across requirement documents.
- No undocumented requirement changes without checklist impact update.
- Keep each requirement document scoped to one concern (product, ELK, UI phase, verification).
- Keep archive references explicit and non-authoritative for active implementation.
