#!/usr/bin/env bash
set -euo pipefail

# Cloudflare API Token Creator for CI/CD
# Creates a token with Workers, R2, and Pages permissions
#
# Prerequisites:
#   - CLOUDFLARE_API_KEY (Global API Key from dashboard)
#   - CLOUDFLARE_EMAIL (Account email)
#   - CLOUDFLARE_ACCOUNT_ID (Account ID)
#
# Usage:
#   export CLOUDFLARE_API_KEY="your-global-api-key"
#   export CLOUDFLARE_EMAIL="your-email@example.com"
#   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
#   ./scripts/create-cf-token.sh

: "${CLOUDFLARE_API_KEY:?Required: CLOUDFLARE_API_KEY (Global API Key)}"
: "${CLOUDFLARE_EMAIL:?Required: CLOUDFLARE_EMAIL}"
: "${CLOUDFLARE_ACCOUNT_ID:?Required: CLOUDFLARE_ACCOUNT_ID}"

TOKEN_NAME="SafeWork2 CI/CD $(date +%Y%m%d-%H%M%S)"
API_BASE="https://api.cloudflare.com/client/v4"

echo "Creating Cloudflare API Token: $TOKEN_NAME"
echo "Account ID: $CLOUDFLARE_ACCOUNT_ID"
echo ""

get_permission_group_id() {
  local name="$1"
  curl -s "$API_BASE/user/tokens/permission_groups" \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" | \
    jq -r --arg name "$name" '.result[] | select(.name == $name) | .id'
}

echo "Fetching permission group IDs..."
WORKERS_SCRIPTS_WRITE=$(get_permission_group_id "Workers Scripts Write")
ACCOUNT_SETTINGS_READ=$(get_permission_group_id "Account Settings Read")
WORKERS_R2_WRITE=$(get_permission_group_id "Workers R2 Storage Write")
PAGES_WRITE=$(get_permission_group_id "Cloudflare Pages Write")

if [ -z "$WORKERS_SCRIPTS_WRITE" ] || [ -z "$ACCOUNT_SETTINGS_READ" ] || [ -z "$WORKERS_R2_WRITE" ] || [ -z "$PAGES_WRITE" ]; then
  echo "ERROR: Could not find required permission groups"
  echo "  Workers Scripts Write: ${WORKERS_SCRIPTS_WRITE:-NOT FOUND}"
  echo "  Account Settings Read: ${ACCOUNT_SETTINGS_READ:-NOT FOUND}"
  echo "  Workers R2 Storage Write: ${WORKERS_R2_WRITE:-NOT FOUND}"
  echo "  Cloudflare Pages Write: ${PAGES_WRITE:-NOT FOUND}"
  exit 1
fi

echo "  Workers Scripts Write: $WORKERS_SCRIPTS_WRITE"
echo "  Account Settings Read: $ACCOUNT_SETTINGS_READ"
echo "  Workers R2 Storage Write: $WORKERS_R2_WRITE"
echo "  Cloudflare Pages Write: $PAGES_WRITE"
echo ""

RESPONSE=$(curl -s -X POST "$API_BASE/user/tokens" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "'"$TOKEN_NAME"'",
    "policies": [
      {
        "effect": "allow",
        "resources": {
          "com.cloudflare.api.account.'"$CLOUDFLARE_ACCOUNT_ID"'": "*"
        },
        "permission_groups": [
          {"id": "'"$WORKERS_SCRIPTS_WRITE"'"},
          {"id": "'"$ACCOUNT_SETTINGS_READ"'"},
          {"id": "'"$WORKERS_R2_WRITE"'"},
          {"id": "'"$PAGES_WRITE"'"}
        ]
      }
    ]
  }')

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  TOKEN_VALUE=$(echo "$RESPONSE" | jq -r '.result.value')
  TOKEN_ID=$(echo "$RESPONSE" | jq -r '.result.id')
  
  echo "=== TOKEN CREATED SUCCESSFULLY ==="
  echo "Token ID: $TOKEN_ID"
  echo "Token Name: $TOKEN_NAME"
  echo ""
  echo "=== ADD THESE TO GITHUB SECRETS ==="
  echo "CLOUDFLARE_API_TOKEN=$TOKEN_VALUE"
  echo "CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID"
  echo ""
  echo "WARNING: This token value is shown only once. Save it now!"
else
  echo "ERROR: Failed to create token"
  echo "$RESPONSE" | jq .
  exit 1
fi
