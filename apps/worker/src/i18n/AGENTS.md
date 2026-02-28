# AGENTS: I18N

## PURPOSE

Client locale runtime for worker app.
Owns locale config, async message loading, translation key resolution/interpolation.

## KEY FILES

| File                | Symbol                                              | Responsibility                            |
| ------------------- | --------------------------------------------------- | ----------------------------------------- |
| `i18n/config.ts`    | `locales`, `defaultLocale`, `localeNames`           | Locale enum and display labels            |
| `i18n/loader.ts`    | `getLocale(locale?)`                                | Dynamic JSON import + fallback chain      |
| `i18n/context.tsx`  | `I18nProvider`, `useI18n`                           | Locale/messages context and loading state |
| `i18n/translate.ts` | `createTranslator`, `getNestedValue`, `interpolate` | Dot-path lookup + `{var}` interpolation   |
| `i18n/index.ts`     | barrel exports                                      | Public i18n API surface                   |

## PATTERNS

- Locale storage key: `i18n-locale` in localStorage.
- Context value shape: `{ locale, setLocale, messages, isLoading }`.
- Translation call style: `t('namespace.key')`, optional vars object.
- Missing key behavior: returns key string unchanged.
- Interpolation format: `{name}` placeholders replaced by stringified vars.
- Locale files present in `src/locales`: `ko.json`, `en.json`, `vi.json`, `zh.json`.

## GOTCHAS

- `config.ts` declares `ko/en/vi/zh`; `loader.ts` currently loads only `ko/en`.
- `context.tsx` may call `console.error/console.warn` in non-production on load failures.
- `setLocale` is async via loader; UI should tolerate transient `isLoading=true`.
- `useI18n` and `useLocale` throw outside provider boundary.
- Keys heavily nested (`auth.error.*`, `posts.pageList.*`, `components.*`); avoid flat-key assumptions.
