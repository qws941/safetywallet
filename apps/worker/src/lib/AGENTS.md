# AGENTS: WORKER LIB

## PURPOSE

- Shared client utilities for hooks/pages/components.
- Owns API transport policy, offline replay, media processing, HTML sanitization.
- Keeps app-level reliability/security behavior centralized.

## FILES/STRUCTURE

- `api.ts`: `apiFetch`, `flushOfflineQueue`, `getOfflineQueueLength`, `ApiError`, queue types.
- `image-compress.ts`: `compressImage`, `compressImages` (canvas/offscreen processing).
- `sanitize-html.ts`: `sanitizeAnnouncementHtml`, `hasHtmlContent`, `renderSanitizedAnnouncementHtml`.
- `utils.ts`: `cn` re-export bridge from `@safetywallet/ui`.
- Tests under `lib/__tests__/` for api/image/sanitize/utils behavior.

## CONVENTIONS

- API base defaults to `NEXT_PUBLIC_API_URL` or `/api`.
- Auth header injected from store unless `skipAuth: true`.
- 401 handling uses refresh mutex; single retry after successful refresh.
- Offline queue primary key: `safetywallet_offline_queue`.
- Legacy queue migration on first access: `safework2_offline_queue` -> `safetywallet_offline_queue`.
- Queue item carries `retryCount`; replay drops item after 5 failed attempts.
- Offline mode with `offlineQueue: true` returns queued sentinel payload.
- Module-level `online` listener triggers automatic queue flush.
- Image compression policy: max 10MB, max dimension 1920, JPEG conversion, EXIF stripped.
- HTML sanitization allowlist includes `p,strong,em,ul,li,blockquote,code,pre,a,img`.

## ANTI-PATTERNS

- Do not create direct `fetch` wrappers outside `api.ts` for standard API flows.
- Do not change queue key names without explicit migration logic.
- Do not run `sanitize-html` helpers in server-only contexts (DOM APIs required).
- Do not bypass image compression path when posting user images from worker pages.
