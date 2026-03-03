# AGENTS: WORKER I18N

## PURPOSE

- Client-side localization runtime for worker app.
- Loads locale JSON bundles and exposes translation helpers.
- Supports Korean-primary UX with English fallback path.

## FILES/STRUCTURE

- `config.ts`: locale source of truth (`locales`, `defaultLocale`, `localeNames`).
- `loader.ts`: lazy locale bundle loader with default fallback.
- `context.tsx`: `I18nProvider` + `useI18n` state/context boundary.
- `translate.ts`: nested key resolver + `{var}` interpolation + translator factory.
- `index.ts`: public i18n exports.
- Tests under `i18n/__tests__/` for config/loader/context/translate/index.

## CONVENTIONS

- Active locales currently defined in code: `ko`, `en`.
- Default locale: `ko`.
- Locale persistence key: `i18n-locale`.
- Context contract: `{ locale, setLocale, messages, isLoading }`.
- Translation call shape: `t("namespace.key", vars?)`.
- Missing key behavior: returns the key string unchanged.
- Placeholder interpolation syntax: `{name}`.
- Provider required for both `useI18n` and downstream adapter hooks (`useLocale`, `useTranslation`).

## ANTI-PATTERNS

- Do not assume `vi/zh` are active locales; they are not in current `config.ts`.
- Do not bypass `loader.ts` in components/pages for locale bundle fetches.
- Do not flatten nested translation keys; existing dictionaries are deeply nested.
- Do not suppress provider-boundary errors; they catch invalid hook usage early.
