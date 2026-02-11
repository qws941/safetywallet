# E2E TESTS

## OVERVIEW

Playwright end-to-end tests. 4 test projects targeting production URLs. 7 spec files, ~1064 total lines.

## STRUCTURE

```
e2e/
├── playwright.config.ts     # 41L — Config: 4 projects, 30s timeout, 0 retries
├── admin-app/               # 261L total
│   ├── pages.spec.ts        # Admin page navigation tests
│   └── smoke.spec.ts        # Admin smoke tests
├── api/                     # 391L total
│   ├── endpoints.spec.ts    # API endpoint tests (largest spec)
│   └── smoke.spec.ts        # API health/smoke tests
├── cross-app/               # 119L total
│   └── integration.spec.ts  # Cross-app integration flows
└── worker-app/              # 293L total
    ├── pages.spec.ts        # Worker page navigation tests
    └── smoke.spec.ts        # Worker smoke tests
```

## PROJECTS

| Project      | Base URL                           | Tests          |
| ------------ | ---------------------------------- | -------------- |
| `api`        | `https://safework2.jclee.me/api/`  | 2 specs (391L) |
| `worker-app` | `https://safework2.jclee.me`       | 2 specs (293L) |
| `admin-app`  | `https://admin.safework2.jclee.me` | 2 specs (261L) |
| `cross-app`  | _(no base URL)_                    | 1 spec (119L)  |

## CONFIG

- **Timeout**: 30 seconds
- **Retries**: 0
- **Reporter**: list
- **Test directory**: `.` (relative to e2e/)
- **Each project**: own subdirectory matching project name

## RUNNING TESTS

```bash
# All tests
npx playwright test --config e2e/playwright.config.ts

# Single project
npx playwright test --config e2e/playwright.config.ts --project=api

# Specific file
npx playwright test --config e2e/playwright.config.ts e2e/api/endpoints.spec.ts
```

## CONVENTIONS

- **Test against production URLs** (safework2.jclee.me)
- **Smoke tests**: Basic page load / health checks
- **Page tests**: Navigation, element presence
- **Endpoint tests**: API request/response validation
- **Integration tests**: Cross-app workflows

## ADDING TESTS

1. Create spec file in appropriate project directory
2. Follow `{feature}.spec.ts` naming
3. Use `test.describe()` for grouping
4. Target production URLs (configured in playwright.config.ts)

## ANTI-PATTERNS

- **No unit tests** — this project uses e2e only
- **No mocking API responses** — tests hit real endpoints
- **No test-specific env variables** — URLs hardcoded in config
