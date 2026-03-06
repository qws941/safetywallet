# AGENTS: VALIDATORS

## PURPOSE

Request validation contract layer using Zod.
Owns schema definitions and exported validator types only.

## INVENTORY

- Top-level validator files (3): `export.ts`, `fas-sync.ts`, `query.ts`.
- Shared schemas dir `schemas/` (4): `auth.ts`, `domain.ts`, `index.ts`, `shared.ts`.
- Test files (3): `export.test.ts`, `fas-sync.test.ts`, `schemas.test.ts` in `__tests__/`.

## CONVENTIONS

- Keep reusable primitives, regexes, and bounds in `schemas/shared.ts`.
- Keep export surface intentional in `schemas/index.ts`; avoid accidental broad re-export.
- Keep date/time and numeric constraints strict and deterministic.
- Keep validator modules side-effect-free and transport-focused.

## ANTI-PATTERNS

- Do not place route control flow or DB logic in validator files.
- Do not relax timestamp parsing into ambiguous free-form acceptance.
- Do not expose internal schema pieces without import contract review.
- Do not drift enum constraints from route and schema consumers.

## DRIFT GUARDS

- Check `src/validators` and `src/validators/schemas` file lists before inventory edits.
- Check every exported validator/type has coverage in `src/validators/__tests__/`.
- Check `schemas/index.ts` export list after adding schema modules.
- Check route imports after validator file rename/move.
