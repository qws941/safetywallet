#!/bin/bash
# sync-r2.sh — Upload build output to Cloudflare R2 bucket
# Usage: bash scripts/sync-r2.sh <source-dir> <bucket-name> [key-prefix]
#
# Arguments:
#   source-dir   Local directory containing files to upload
#   bucket-name  R2 bucket name
#   key-prefix   Optional prefix prepended to R2 object keys (e.g. "admin")
#
# Requires env vars: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL
# Or: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

set -euo pipefail

SOURCE_DIR="${1:?Usage: sync-r2.sh <source-dir> <bucket-name> [key-prefix]}"
BUCKET="${2:?Usage: sync-r2.sh <source-dir> <bucket-name> [key-prefix]}"
KEY_PREFIX="${3:-}"

SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"

# Normalize prefix: ensure trailing slash if non-empty
if [ -n "$KEY_PREFIX" ]; then
  KEY_PREFIX="${KEY_PREFIX%/}/"
fi

get_content_type() {
  case "${1##*.}" in
    html)          echo "text/html; charset=utf-8" ;;
    js)            echo "application/javascript" ;;
    css)           echo "text/css" ;;
    json)          echo "application/json" ;;
    png)           echo "image/png" ;;
    jpg|jpeg)      echo "image/jpeg" ;;
    gif)           echo "image/gif" ;;
    svg)           echo "image/svg+xml" ;;
    ico)           echo "image/x-icon" ;;
    woff2)         echo "font/woff2" ;;
    woff)          echo "font/woff" ;;
    ttf)           echo "font/ttf" ;;
    txt)           echo "text/plain" ;;
    xml)           echo "application/xml" ;;
    webmanifest)   echo "application/manifest+json" ;;
    map)           echo "application/json" ;;
    webp)          echo "image/webp" ;;
    avif)          echo "image/avif" ;;
    *)             echo "application/octet-stream" ;;
  esac
}

uploaded=0
failed=0
total=$(find "$SOURCE_DIR" -type f | wc -l)

echo "=== R2 Sync: $total files from $SOURCE_DIR -> $BUCKET (prefix: ${KEY_PREFIX:-<none>}) ==="

while read -r file; do
  key="${KEY_PREFIX}${file#$SOURCE_DIR/}"
  ct=$(get_content_type "$file")

  if npx wrangler r2 object put "$BUCKET/$key" --file "$file" --content-type "$ct" --remote 2>/dev/null; then
    uploaded=$((uploaded + 1))
    echo "[$uploaded/$total] $key ($ct)"
  else
    failed=$((failed + 1))
    echo "[FAIL] $key" >&2
  fi
done < <(find "$SOURCE_DIR" -type f)

echo "=== R2 Sync complete: uploaded=$uploaded failed=$failed total=$total ==="

if [ "$failed" -gt 0 ]; then
  echo "::error::R2 sync had $failed failed uploads"
  exit 1
fi
