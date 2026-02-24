#!/bin/bash
# sync-r2.sh — Upload build output to Cloudflare R2 bucket (parallel)
# Usage: bash scripts/sync-r2.sh <source-dir> <bucket-name> [key-prefix]
#
# Arguments:
#   source-dir   Local directory containing files to upload
#   bucket-name  R2 bucket name
#   key-prefix   Optional prefix prepended to R2 object keys (e.g. "admin")
#
# Environment:
#   CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL  — or —
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
#   R2_SYNC_PARALLEL  — upload concurrency (default: 10)

set -euo pipefail

SOURCE_DIR="${1:?Usage: sync-r2.sh <source-dir> <bucket-name> [key-prefix]}"
BUCKET="${2:?Usage: sync-r2.sh <source-dir> <bucket-name> [key-prefix]}"
KEY_PREFIX="${3:-}"
PARALLEL="${R2_SYNC_PARALLEL:-10}"

SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"

# Normalize prefix: ensure trailing slash if non-empty
if [ -n "$KEY_PREFIX" ]; then
  KEY_PREFIX="${KEY_PREFIX%/}/"
fi

# Resolve wrangler binary once to avoid npx spawn overhead per file
if [ -x "node_modules/.bin/wrangler" ]; then
  WRANGLER="$(pwd)/node_modules/.bin/wrangler"
elif command -v wrangler &>/dev/null; then
  WRANGLER="wrangler"
else
  WRANGLER="npx wrangler"
fi

# Temp dir for failure tracking across parallel subprocesses
FAIL_DIR=$(mktemp -d)
trap 'rm -rf "$FAIL_DIR"' EXIT

upload_one() {
  local file="$1"
  local key="${KEY_PREFIX}${file#${SOURCE_DIR}/}"
  local ct

  case "${file##*.}" in
    html)          ct="text/html; charset=utf-8" ;;
    js)            ct="application/javascript" ;;
    css)           ct="text/css" ;;
    json)          ct="application/json" ;;
    png)           ct="image/png" ;;
    jpg|jpeg)      ct="image/jpeg" ;;
    gif)           ct="image/gif" ;;
    svg)           ct="image/svg+xml" ;;
    ico)           ct="image/x-icon" ;;
    woff2)         ct="font/woff2" ;;
    woff)          ct="font/woff" ;;
    ttf)           ct="font/ttf" ;;
    txt)           ct="text/plain" ;;
    xml)           ct="application/xml" ;;
    webmanifest)   ct="application/manifest+json" ;;
    map)           ct="application/json" ;;
    webp)          ct="image/webp" ;;
    avif)          ct="image/avif" ;;
    *)             ct="application/octet-stream" ;;
  esac

  if $WRANGLER r2 object put "$BUCKET/$key" --file "$file" --content-type "$ct" --remote 2>/dev/null; then
    echo "[OK] $key"
  else
    mktemp -p "$FAIL_DIR" fail.XXXXXX > /dev/null
    echo "[FAIL] $key" >&2
  fi
}
export -f upload_one
export SOURCE_DIR BUCKET KEY_PREFIX WRANGLER FAIL_DIR

total=$(find "$SOURCE_DIR" -type f | wc -l)
echo "=== R2 Sync: $total files -> $BUCKET (prefix: ${KEY_PREFIX:-<none>}, parallel: $PARALLEL) ==="

find "$SOURCE_DIR" -type f -print0 | xargs -0 -P "$PARALLEL" -n1 bash -c 'upload_one "$@"' _

failed=$(find "$FAIL_DIR" -name 'fail.*' 2>/dev/null | wc -l)
uploaded=$(( total - failed ))

echo "=== R2 Sync complete: uploaded=$uploaded failed=$failed total=$total ==="

if [ "$failed" -gt 0 ]; then
  echo "::error::R2 sync had $failed failed uploads"
  exit 1
fi
