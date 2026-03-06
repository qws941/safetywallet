# E2E Tests

Playwright end-to-end tests for worker and admin apps.

## Purpose

- Authenticated E2E tests for admin dashboard and worker PWA
- Smoke tests (unauthenticated) for page load validation
- 1Password integration for secure credential injection

## Structure

```
e2e/
├── auth/
│   ├── admin-setup.ts         # Playwright setup: admin login → storageState
│   └── worker-setup.ts        # Playwright setup: worker login → storageState
├── admin/
│   ├── dashboard.spec.ts      # Admin dashboard authenticated tests
│   └── smoke.spec.ts          # Admin unauthenticated smoke tests
├── worker/
│   ├── home.spec.ts           # Worker home authenticated tests
│   └── smoke.spec.ts          # Worker unauthenticated smoke tests
└── .auth/                     # Generated auth state (gitignored)
    ├── admin.json
    └── worker.json
```

## Playwright Projects (playwright.config.ts)

| Project      | Auth   | Depends On   | Purpose                         |
| ------------ | ------ | ------------ | ------------------------------- |
| admin-setup  | Login  | —            | Admin login, save storageState  |
| worker-setup | Login  | —            | Worker login, save storageState |
| admin-smoke  | None   | —            | Admin page load smoke tests     |
| worker-smoke | None   | —            | Worker page load smoke tests    |
| admin        | Stored | admin-setup  | Authenticated admin tests       |
| worker       | Stored | worker-setup | Authenticated worker tests      |

## Credentials

Credentials are stored in 1Password and injected via `op run --env-file=.env.e2e`:

| Env Var            | 1Password Reference                                                             |
| ------------------ | ------------------------------------------------------------------------------- |
| `ADMIN_USERNAME`   | `op://homelab/safetywallet/username`                                            |
| `ADMIN_PASSWORD`   | `op://homelab/safetywallet/password`                                            |
| `E2E_WORKER_NAME`  | `op://homelab/safetywallet/Section_x4jgxu76f7oo77r7lz75zkfvjm/e2e_worker_name`  |
| `E2E_WORKER_PHONE` | `op://homelab/safetywallet/Section_x4jgxu76f7oo77r7lz75zkfvjm/e2e_worker_phone` |
| `E2E_WORKER_DOB`   | `op://homelab/safetywallet/Section_x4jgxu76f7oo77r7lz75zkfvjm/e2e_worker_dob`   |

## Scripts

- `npm run e2e` — Run all E2E tests (credentials via `op run`).
- `npm run e2e:headed` — Run with visible browser window.
- `npm run e2e:ui` — Open Playwright UI mode.

## Conventions

- Auth setup projects run first and save storageState to `e2e/.auth/`.
- Authenticated test projects depend on setup projects via `dependencies`.
- webServer config auto-starts worker (port 3000) and admin (port 3001) dev servers.
- CI mode: `retries: 2`, `workers: 1`, `reporter: github`.
- Smoke tests require no credentials — test page load only.
- Keep auth setup logic isolated in `e2e/auth/*-setup.ts` only.
- Keep smoke specs side-effect free so they run as fast health checks.

## Anti-Patterns

- Do not hardcode credentials in test files; use environment variables via 1Password.
- Do not commit `e2e/.auth/` directory (storageState files).
- Do not add setup logic in spec files; use Playwright setup projects.
