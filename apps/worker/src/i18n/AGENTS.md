# Worker I18n Runtime

## PURPOSE

- Client i18n runtime contract for locale config, loading, context, and translation helpers.
- Keep translation resolution and locale persistence behavior centralized.

## INVENTORY

- `AGENTS.md` - i18n-layer contract.
- `config.ts` - locale union + default locale + locale display names.
- `loader.ts` - async locale bundle resolver with fallback path.
- `context.tsx` - `I18nProvider`, context state, `useI18n` hook.
- `translate.ts` - dot-path lookup + `{var}` interpolation + translator factory.
- `index.ts` - public export surface.
- `__tests__/` - i18n contract tests.

## CONVENTIONS

- `config.ts` locale source currently declares `ko`, `en`, `vi`, `zh`; default `ko`.
- `loader.ts` currently maps `ko`, `en`, `zh` bundles explicitly; unknown/missing map falls back to default locale.
- Locale persistence key remains `i18n-locale`.
- Provider context shape: `{ locale, setLocale, messages, isLoading }`.
- Translation key format remains dot-notated (`section.camelCaseKey`).
- Missing key behavior returns key string as-is.
- Interpolation placeholder format remains `{name}`.
- `useI18n` provider boundary error stays explicit.

## ANTI-PATTERNS

- No direct locale JSON imports in UI modules.
- No flattening of nested translation dictionary structure.
- No silencing/removal of provider-boundary guard errors.
- No UI locale option added outside config/source-of-truth.
- No divergence between key format conventions and runtime lookup implementation.

## DRIFT GUARDS

- Verify `src/locales/*.json` list matches `config.ts` locale union.
- Verify loader map covers every configured locale or document fallback intent.
- Verify locale persistence key unchanged across i18n context + locale hook.
- Recheck tests when context shape or translator contracts change.
- Keep this file runtime-layer scoped; route/component wording belongs in sibling AGENTS files.
