# Worker Lib

## PURPOSE

- Shared client utility boundary for transport, offline replay, media prep, and HTML sanitization.
- Keep reliability/security-sensitive helper logic centralized under `src/lib`.

## INVENTORY

- `AGENTS.md` - lib-layer contract.
- `api.ts` - `apiFetch`, refresh mutex, offline queue/replay helpers, queue length helper, `ApiError`.
- `image-compress.ts` - image compression + resize + EXIF strip pipeline.
- `sanitize-html.ts` - sanitize + render helpers for announcement content.
- `utils.ts` - shared `cn` utility re-export.
- `__tests__/` - lib-layer contract tests.

## CONVENTIONS

- Base URL: `NEXT_PUBLIC_API_URL || "/api"`.
- `apiFetch` attaches bearer token unless `skipAuth: true`.
- 401 retry path uses single refresh mutex (`refreshPromise`) then one retry.
- Offline queue key: `safetywallet_offline_queue`; legacy key migration from `safework2_offline_queue`.
- Offline enqueue path returns queued sentinel payload when `offlineQueue: true` and browser is offline.
- Replay keeps failed items until `retryCount` reaches 5; online event triggers replay.
- Compression policy: reject image >10MB; max dimension 1920; JPEG output.
- Sanitizer tag allowlist: `p,strong,em,ul,li,blockquote,code,pre,a,img`; unsafe schemes blocked.

## ANTI-PATTERNS

- No parallel transport abstraction beside `apiFetch`.
- No queue-key rename without migration code and backward read path.
- No raw announcement HTML render without sanitize/render helper.
- No direct upload path that bypasses compression helpers.
- No token refresh logic copied into hooks/components.

## DRIFT GUARDS

- Verify queue keys remain aligned with hooks/components docs and behavior.
- Verify refresh path still updates Zustand tokens and logs out on terminal failure.
- Verify sanitizer allowlist/safe URL rules on any HTML feature change.
- Verify image limits (size/dimension/quality) when upload constraints change.
- Recheck tests in `src/lib/__tests__/` when helper signatures move.
