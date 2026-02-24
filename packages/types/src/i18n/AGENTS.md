# AGENTS: TYPES/I18N

## SCOPE DELTA

- Folder owns concrete key map + typed locale exports.
- Parent covers package-wide type constraints; this file tracks key topology.

## FILES

- `ko.ts`: flat `as const` dictionary; key format `section.key`.
- `index.ts`: exports `ko`, `Ko`, `i18n`, `I18n`.

## KEY STRUCTURE (CURRENT)

- Non-nested object; all keys dot-notated string literals.
- Current prefix groups (27):
  `login`, `register`, `home`, `posts`, `postsCreate`, `postsView`,
  `points`, `votes`, `actions`, `actionsCreate`, `actionsView`,
  `announcements`, `education`, `educationQuizTake`, `educationView`,
  `profile`, `nav`, `common`, `unsafeWarning`, `authGuard`, `attendanceGuard`,
  `layout`, `providers`, `header`, `pointsCard`, `postCard`, `rankingCard`.
- `common.*` is the largest shared bucket; avoid dumping domain copy into it.

## TYPING CONTRACT

- Keep `ko` exported with `as const`.
- Keep `export type Ko = typeof ko` in `ko.ts`.
- Keep `i18n = { ko }` object literal in `index.ts`.
- `I18n` must remain `typeof i18n`.

## EDIT RULES (MODULE-SPECIFIC)

- New keys: add in semantically matching prefix block.
- Prefix rename: treated as breaking API for translation consumers.
- Keep comments as section delimiters only; no runtime helpers.
- Keep values production-ready Korean strings (no placeholders/test copy).

## ANTI-DRIFT

- Do not introduce nested objects; keeps `keyof` ergonomics stable.
- Do not create locale aliases that diverge from `ko` keyset.
- Do not split catalog unless multi-locale architecture is introduced intentionally.
