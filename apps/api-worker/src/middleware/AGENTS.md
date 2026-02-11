# API MIDDLEWARE

## OVERVIEW

6 middleware functions for auth, authorization, attendance verification, rate limiting, and security headers. All middleware uses **manual invocation pattern** (NOT Hono `.use()`) except `security-headers.ts` which uses `createMiddleware`.

## FILES

| File                  | Lines | Purpose                                             |
| --------------------- | ----- | --------------------------------------------------- |
| `auth.ts`             | 40    | JWT Bearer token verification, sets `c.auth`        |
| `attendance.ts`       | 122   | Site membership + daily attendance check            |
| `permission.ts`       | 206   | RBAC: role-based and field-based access control     |
| `rate-limit.ts`       | 95    | Durable Objects rate limiter (100 req/60s default)  |
| `fas-auth.ts`         | 23    | FAS API key authentication (`X-FAS-API-Key` header) |
| `security-headers.ts` | 22    | CSP, HSTS, X-Frame-Options, Referrer-Policy         |

## KEY PATTERNS

### Auth Middleware (`auth.ts`)

```typescript
// Verifies JWT, checks same-day via loginDate (NOT standard exp)
// Sets c.auth = { user: { id, phone, role, name, nameMasked }, loginDate }
// Korean error messages: "인증 토큰이 필요합니다", "만료된 세션입니다"
```

### Permission Middleware (`permission.ts`)

```typescript
// Role-based: SUPER_ADMIN bypasses all role checks
requireRole("ADMIN", "MANAGER");
requireAdmin; // shortcut for requireRole('ADMIN', 'SUPER_ADMIN')
requireManagerOrAdmin; // shortcut for requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')
requireExportAccess; // checks canExportData permission field

// Field-based: checks siteMemberships permission columns
requirePermission("piiViewFull");
requirePermission("canAwardPoints");
requirePermission("canManageUsers");
requirePermission("canReview");
requirePermission("canExportData");
```

### Attendance Middleware (`attendance.ts`)

```typescript
// Checks: site membership → daily attendance record → manual approval override
// Takes optional siteId parameter
// Uses in-memory idempotency cache (1-hour TTL)
await attendanceMiddleware(
  c,
  async () => {
    /* handler */
  },
  siteId,
);
```

### Rate Limiter (`rate-limit.ts`)

```typescript
// Uses RATE_LIMITER Durable Object binding
// Falls back to pass-through if DO not configured
// Options: maxRequests (default: 100), windowMs (default: 60000), keyGenerator
```

## INVOCATION PATTERN

```typescript
// CORRECT: Manual invocation inside route handlers
app.post("/endpoint", async (c) => {
  await attendanceMiddleware(
    c,
    async () => {
      // handler logic
    },
    siteId,
  );
});

// WRONG: Do NOT use Hono .use() for these middleware
// (Exception: admin routes use .use('*', authMiddleware) — see admin/AGENTS.md)
```

## ANTI-PATTERNS

- **Never use `.use()` for per-route middleware** — only manual invocation
- **Never skip auth middleware** — all authenticated routes must verify JWT
- **Never hardcode roles** — use `requireRole()` / `requirePermission()`
- **Never assume DO binding exists** — rate limiter must handle missing binding gracefully
