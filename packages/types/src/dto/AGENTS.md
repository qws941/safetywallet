# AGENTS: TYPES/DTO

## OVERVIEW

**Context:** Shared DTO contract layer **Scope:** Cross-app payload/request/response shapes under `@safetywallet/types`

This directory defines domain DTO contracts used by API worker and both frontend apps; compatibility and naming consistency are critical.

## WHERE TO LOOK

| Task              | Location                           | Notes                                  |
| ----------------- | ---------------------------------- | -------------------------------------- |
| Add new DTO       | `*.dto.ts`                         | Keep domain-focused file placement     |
| Export DTO        | `index.ts`                         | Re-export every public DTO type        |
| Align enum fields | `apps/api-worker/src/db/schema.ts` | Keep DTO unions/enums in schema parity |

## CONVENTIONS

- Use `*Dto` suffix for request/response object contracts.
- Keep DTOs type-only (`interface`/`type`/enum references), no runtime logic.
- Group related types in the domain file (e.g., auth, post, review) rather than scattering.
- Prefer backward-compatible additions for fields consumed by multiple apps.

## ANTI-PATTERNS

- Do not add validation/parsing code (belongs to API validators).
- Do not import via deep private paths from consuming apps; use package barrel.
- Do not use `any`; model uncertain fields as `unknown` + narrowed types upstream.
- Do not silently rename or remove widely used DTO fields without coordinated rollout.
