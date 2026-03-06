# AGENTS: WORKER LIB

## PURPOSE

- Shared client utility boundary used by hooks, routes, and components.
- Owns API transport + refresh, offline queue replay, image processing, and HTML sanitization.
- Keeps reliability and security-sensitive behavior centralized in one layer.

## FILES/STRUCTURE

- `api.ts`: `apiFetch`, `flushOfflineQueue`, `getOfflineQueueLength`, `ApiError`, queue item types.
- `image-compress.ts`: `compressImage`, `compressImages` with canvas/offscreen JPEG pipeline.
- `sanitize-html.ts`: sanitize + render helpers for announcement HTML.
- `utils.ts`: `cn` re-export from `@safetywallet/ui`.
- `__tests__/api.test.ts`: transport/offline queue/refresh behavior.
- `__tests__/image-compress.test.ts`: compression/size handling behavior.
- `__tests__/sanitize-html.test.ts`: allowlist and sanitization behavior.
- `__tests__/utils.test.ts`: utility bridge contract.

## CONVENTIONS

- API base resolves as `NEXT_PUBLIC_API_URL || "/api"`.
- `apiFetch` injects `Authorization` header unless `skipAuth: true`.
- 401 path uses a refresh mutex (`refreshPromise`) and retries once after refresh.
- Offline queue key is localStorage-backed: `safetywallet_offline_queue`.
- Legacy queue migration runs once from `safework2_offline_queue`.
- Offline-safe calls use `offlineQueue: true` and receive queued sentinel payload.
- Replay drops an item after 5 failed attempts (`retryCount < 5`).
- `window` online event triggers `flushOfflineQueue()` automatically.
- Image policy: reject over 10MB, max dimension 1920, JPEG conversion, EXIF stripped.
- Sanitizer allowlist is strict (`p,strong,em,ul,li,blockquote,code,pre,a,img`) with safe URL checks.

## ANTI-PATTERNS

- Do not introduce parallel fetch wrappers for standard worker API calls.
- Do not rename queue keys without migration logic in the same change.
- Do not run sanitization helpers outside browser DOM contexts.
- Do not bypass `compressImage`/`compressImages` for user-uploaded images.
