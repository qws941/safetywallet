# Requirements

## PURPOSE

- Requirement/PRD authority subtree for implementation scope and verification artifacts.
- Tracks active requirement docs plus archived historical plan reference.

## INVENTORY

- `AGENTS.md` — local requirements governance.
- `REQUIREMENTS_CHECKLIST.md` — requirement status ledger.
- `SafetyWallet_PRD_v1.1.md` — baseline PRD.
- `Phase3_UI_Simplification_PRD.md` — phase-specific UI scope.
- `ELK_INDEX_PREFIX_REQUIREMENTS.md` — ELK index prefix requirements.
- `IMPLEMENTATION_VERIFICATION_CHECKLIST.md` — implementation evidence checklist.
- `REGISTRATION_VERIFICATION_REPORT.md` — registration verification report.
- `archived/` — historical requirement docs directory.
- `archived/SafetyWallet_Implementation_Plan_v1.0.md` — archived implementation plan.

## CONVENTIONS

- Write requirements as testable statements with observable evidence.
- Keep status changes centralized in `REQUIREMENTS_CHECKLIST.md`.
- Keep PRD deltas explicit when scope or acceptance criteria change.
- Keep archive files read-only references for historical context.
- Keep non-requirement operational guidance out of this subtree.

## ANTI-PATTERNS

- Active implementation decisions sourced from `archived/*`.
- Multiple conflicting status trackers in parallel docs.
- Requirement edits without checklist impact update.
- Mixing unrelated concern domains in a single requirement doc.

## DRIFT GUARDS

- Confirm directory remains 8 entries (7 files + `archived/`).
- Confirm `archived/` remains exactly 1 historical file.
- Confirm every active doc is referenced with current filename.
- Confirm requirement status source remains singular (`REQUIREMENTS_CHECKLIST.md`).
