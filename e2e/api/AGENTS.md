# AGENTS: E2E/API

## SCOPE DELTA

- API request-context tests only (`request` fixture).
- No browser UI assertions in this folder.

## SPEC INVENTORY (20)

- `actions.spec.ts`
- `admin-endpoints.spec.ts`
- `announcements.spec.ts`
- `approvals.spec.ts`
- `attendance.spec.ts`
- `disputes.spec.ts`
- `endpoints.spec.ts`
- `fas.spec.ts`
- `images.spec.ts`
- `notifications.spec.ts`
- `points.spec.ts`
- `policies.spec.ts`
- `posts.spec.ts`
- `protected-endpoints.spec.ts`
- `reviews.spec.ts`
- `sites.spec.ts`
- `smoke.spec.ts`
- `users.spec.ts`
- `validation-edge-cases.spec.ts`
- `votes.spec.ts`

## MODULE RULES

- Keep auth lifecycle/token reuse steps serial where state is shared.
- Keep 429/rate-limit handling explicit on login-heavy sequences.
- Validate both HTTP status and response envelope shape.
- Keep CORS checks for worker + admin origins.
- Use env-based credentials/URLs; no hardcoded secrets.

## ENV INPUTS

- Worker credential fallbacks:
  - `E2E_WORKER_NAME`
  - `E2E_WORKER_PHONE`
  - `E2E_WORKER_DOB`
- URL fallbacks controlled by Playwright config (`API_URL`, app URLs).

## ANTI-DRIFT

- No static bearer token fixtures in repo.
- No response-body regression masking.
- No stale two-file inventory text.
