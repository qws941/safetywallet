# AGENTS: REQUIREMENTS

## DELTA SCOPE

Requirements-subtree only.
Parent `docs/AGENTS.md` owns docs-wide governance.

## CURRENT FILE SET

- `SafetyWallet_PRD_v1.1.md`
- `REQUIREMENTS_CHECKLIST.md`
- `ELK_INDEX_PREFIX_REQUIREMENTS.md`
- `Phase3_UI_Simplification_PRD.md`
- `SafetyWallet_Implementation_Plan_v1.0.md` (deprecated archive)

## FILE ROLES

- `REQUIREMENTS_CHECKLIST.md`: operational comparison ledger.
- `SafetyWallet_PRD_v1.1.md`: baseline product requirement corpus.
- `ELK_INDEX_PREFIX_REQUIREMENTS.md`: focused technical requirement contract.
- `Phase3_UI_Simplification_PRD.md`: completed phase-specific change spec.
- `SafetyWallet_Implementation_Plan_v1.0.md`: historical only.

## MODULE RULES

- Keep acceptance criteria explicit and testable.
- Keep superseded requirements annotated, not silently removed.
- Keep conflict resolution notes when checklist diverges from baseline PRD.
- Keep implementation-plan file clearly marked deprecated.
- Keep operations procedures out of this subtree (runbook lives in `docs/cloudflare-operations.md`).

## ANTI-DRIFT

- Do not treat deprecated plan as active architecture source.
- Do not copy requirement status tables across multiple files.
- Do not hide scope changes without date/version markers.
