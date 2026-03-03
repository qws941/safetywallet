# AGENTS: TYPES/I18N

## SCOPE DELTA

- Folder owns typed locale catalog contracts.
- Parent owns package-level policy.

## FILE INVENTORY (2)

- `ko.ts` - Korean catalog (`as const`, dot-notated keys).
- `index.ts` - locale registry + exported types.

## KEY TOPOLOGY

- Flat object; no nested locale objects.
- Key format: `section.key`.
- Active section groups (27):
  `login`, `register`, `home`, `posts`, `postsCreate`, `postsView`,
  `points`, `votes`, `actions`, `actionsCreate`, `actionsView`,
  `announcements`, `education`, `educationQuizTake`, `educationView`,
  `profile`, `nav`, `common`, `unsafeWarning`, `authGuard`, `attendanceGuard`,
  `layout`, `providers`, `header`, `pointsCard`, `postCard`, `rankingCard`.

## TYPING CONTRACT

- `ko.ts` must keep `export const ko = { ... } as const`.
- `ko.ts` must keep `export type Ko = typeof ko`.
- `index.ts` must keep `const i18n = { ko }`.
- `index.ts` must export `I18n = typeof i18n`.

## MODULE RULES

- New key: place under existing semantic section when possible.
- New section prefix: treat as contract change; update consumers/tests.
- Keep strings production-grade Korean copy.
- Keep only section-divider comments; no runtime helper logic in this folder.

## ANTI-DRIFT

- No nested key hierarchy.
- No alias locale objects with divergent keys.
- No stale section list/count in this file.
