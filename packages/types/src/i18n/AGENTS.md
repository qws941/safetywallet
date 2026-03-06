# I18n

Typed locale catalog contracts for shared UI text.

## Inventory (2 files)

- `ko.ts` — canonical Korean locale dictionary exported `as const`.
- `index.ts` — locale registry (`const i18n = { ko }`) and type exports (`I18n`, `Ko`).

## Keyspace Model

- Key format is flat dot notation: `section.key`.
- Current section-group prefixes (27):
  `login`, `register`, `home`, `posts`, `postsCreate`, `postsView`, `points`, `votes`,
  `actions`, `actionsCreate`, `actionsView`, `announcements`, `education`,
  `educationQuizTake`, `educationView`, `profile`, `nav`, `common`, `unsafeWarning`,
  `authGuard`, `attendanceGuard`, `layout`, `providers`, `header`, `pointsCard`,
  `postCard`, `rankingCard`.

## Conventions

- Keep `ko.ts` as the contract source for key completeness and naming.
- `index.ts` must remain the single typed registry surface for locale consumers.
- Add new keys under existing section prefixes whenever semantics allow.
- Introducing a new section prefix is a contract-level change and requires coordinated app updates.
- Preserve key naming stability to avoid runtime translation misses.

## Drift Guards

- No nested locale object trees; keep flat `section.key` keys.
- No duplicate aliases that point to different text for the same semantic key.
- No app-local key creation that bypasses this shared catalog.
