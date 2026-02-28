# AGENTS: LIB

## PURPOSE

Client runtime primitives shared by hooks/pages.
Network transport, offline queue replay, media sanitation/compression, small helpers.

## KEY FILES

| File                    | Exports                                                                         | Responsibility                                                   |
| ----------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `lib/api.ts`            | `apiFetch`, `flushOfflineQueue`, `getOfflineQueueLength`, `ApiError`            | Auth header injection, 401 refresh mutex, optional offline queue |
| `lib/image-compress.ts` | `compressImage`, `compressImages`                                               | Canvas-based JPEG conversion + resize + EXIF strip               |
| `lib/sanitize-html.ts`  | `sanitizeAnnouncementHtml`, `hasHtmlContent`, `renderSanitizedAnnouncementHtml` | Announcement HTML allowlist sanitizer + React node rendering     |
| `lib/utils.ts`          | `cn` re-export                                                                  | UI class merge bridge                                            |

## PATTERNS

- `apiFetch` defaults `API_BASE_URL` from `NEXT_PUBLIC_API_URL` or `/api`.
- `apiFetch` 401 flow: `refreshToken()` mutex -> retry original request once.
- Offline queue item shape: `{ id, endpoint, options, createdAt, retryCount }`.
- Queue replay cap: max 5 retries per queued item.
- Image policy: max file 10MB, max dimension 1920, JPEG quality 0.8 (0.92 for small files).
- Sanitizer allowlist tags: `p,strong,em,ul,li,blockquote,code,pre,a,img`.

## GOTCHAS

- Queue key string is `safework2_offline_queue` (legacy prefix).
- `apiFetch` can return queued sentinel payload (`{ success: true, data: null, queued: true }`) when offline queue enabled.
- `apiFetch` adds `Content-Type: application/json` unless request body is `FormData`.
- `flushOfflineQueue()` auto-runs on browser `online` event at module load.
- `sanitize-html.ts` uses browser DOM APIs; client-only usage required.
- Some flows still call native `fetch` directly (`login-client`, store logout).
