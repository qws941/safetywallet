# AGENTS: WORKER I18N

## PURPOSE

- Client-side i18n runtime for worker app pages/components.
- Loads locale bundles and exposes context + translation helpers.
- Maintains Korean-first default with fallback-safe loading behavior.

## FILES/STRUCTURE

- `config.ts` - locale source of truth (`locales`, `defaultLocale`, `localeNames`).
- `loader.ts` - lazy locale JSON loader with default-locale fallback.
- `context.tsx` - `I18nProvider`, `I18nContext`, `useI18n`.
- `translate.ts` - nested key lookup + `{var}` interpolation + translator factory.
- `index.ts` - public i18n exports.
- `__tests__/config.test.ts` - locale config contract tests.
- `__tests__/loader.test.ts` - loader fallback and load behavior.
- `__tests__/context.test.tsx` - provider/hook behavior tests.
- `__tests__/translate.test.ts` - translation and interpolation tests.
- `__tests__/index.test.ts` - export surface tests.

## CONVENTIONS

- `config.ts` defines locales: `ko`, `en`, `vi`, `zh`; default locale is `ko`.
- `loader.ts` currently has explicit loaders for `ko`, `en`, and `zh`.
- Locale persistence key is `i18n-locale`.
- Context shape is `{ locale, setLocale, messages, isLoading }`.
- Translation call contract: `t("namespace.key", vars?)`.
- Missing translation keys return the key string unchanged.
- Placeholder interpolation uses `{name}` syntax.
- `useI18n`, `useLocale`, and `useTranslation` require provider context.

## Anti-Patterns

- Do not bypass `loader.ts` by importing locale JSON directly in UI code.
- Do not flatten nested key structures in translation dictionaries.
- Do not suppress provider-boundary errors from i18n hooks.
- Do not add locale options in UI that are absent from `config.ts`.
