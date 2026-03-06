# AGENTS: ROUTE TESTS

## PURPOSE

Integration test ownership for non-admin route surfaces.
Validates route contract behavior, guard paths, and response envelopes.

## INVENTORY

- Test suites (19): `actions.test.ts`, `announcements.test.ts`, `approvals.test.ts`, `attendance.test.ts`, `auth.test.ts`, `disputes.test.ts`, `education.test.ts`, `fas.test.ts`, `images.test.ts`, `notifications.test.ts`, `points.test.ts`, `policies.test.ts`, `posts.test.ts`, `recommendations.test.ts`, `reviews.test.ts`, `sites.test.ts`, `system-status.test.ts`, `users.test.ts`, `votes.test.ts`.
- Local doc: `AGENTS.md`.

## CONVENTIONS

- Keep one suite per route domain file family.
- Keep test fixtures deterministic for ids, timestamps, and auth context.
- Keep success and failure-path assertions in the same suite for each domain.
- Keep envelope assertions explicit; include payload shape and key fields.

## ANTI-PATTERNS

- Do not mix admin route test cases into this directory.
- Do not reduce route tests to status-code-only assertions.
- Do not share mutable mock state across suite files.
- Do not move entrypoint endpoint tests without preserving naming clarity.

## DRIFT GUARDS

- Check non-admin route file list and ensure suite parity by domain name.
- Check `system-status.test.ts` remains mapped to entrypoint-owned endpoint behavior.
- Check added route modules trigger corresponding new `*.test.ts` files.
- Check removed route modules trigger test cleanup.
