#!/usr/bin/env bash
# SafetyWallet Full Verification Suite
# Runs all quality gates in dependency order. Exit 1 on first failure.
# Usage: bash scripts/verify.sh [--skip-build] [--parallel]
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SKIP_BUILD=false
PARALLEL=false
FAILURES=0
PASSED=0
SKIPPED=0
TOTAL_START=$(date +%s)

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --parallel) PARALLEL=true ;;
  esac
done

step() {
  local n="$1" label="$2"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}[$n] $label${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

run_check() {
  local label="$1"
  shift
  local start=$(date +%s)
  if "$@" 2>&1; then
    local elapsed=$(( $(date +%s) - start ))
    echo -e "${GREEN}✓ $label (${elapsed}s)${NC}"
    PASSED=$((PASSED + 1))
    return 0
  else
    local elapsed=$(( $(date +%s) - start ))
    echo -e "${RED}✗ $label FAILED (${elapsed}s)${NC}"
    FAILURES=$((FAILURES + 1))
    return 1
  fi
}

# ── Step 1: Typecheck ──
step "1/7" "TypeScript Type Check"
run_check "typecheck" npx turbo run typecheck || true

# ── Step 2: Lint ──
step "2/7" "ESLint"
run_check "lint" npx turbo run lint || true

# ── Step 3: Unit Tests ──
step "3/7" "Unit Tests (Vitest)"
run_check "test" npx vitest run || true

# ── Step 4: Anti-pattern Check ──
step "4/7" "Anti-pattern Scan"
# Collect all staged + tracked TS/TSX files (skip node_modules, dist, .next, out)
TSFILES=$(find apps/ packages/ -type f \( -name '*.ts' -o -name '*.tsx' \) \
  ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/.next/*' ! -path '*/out/*' \
  2>/dev/null | head -500)
if [ -n "$TSFILES" ]; then
  run_check "anti-patterns" bash scripts/check-anti-patterns.sh $TSFILES || true
else
  echo -e "${YELLOW}⊘ No TS/TSX files found to scan${NC}"
  SKIPPED=$((SKIPPED + 1))
fi

# ── Step 5: Naming Lint ──
step "5/7" "Naming Convention Check"
run_check "lint:naming" node scripts/lint-naming.js || true

# ── Step 6: Wrangler Sync ──
step "6/7" "Wrangler Binding Sync"
run_check "wrangler-sync" node scripts/check-wrangler-sync.js || true

# ── Step 7: Build ──
if [ "$SKIP_BUILD" = true ]; then
  step "7/7" "Build (SKIPPED)"
  echo -e "${YELLOW}⊘ Build skipped via --skip-build${NC}"
  SKIPPED=$((SKIPPED + 1))
else
  step "7/7" "Production Build"
  run_check "build" npx turbo run build || true
fi

# ── Summary ──
TOTAL_ELAPSED=$(( $(date +%s) - TOTAL_START ))
TOTAL=$((PASSED + FAILURES + SKIPPED))

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}VERIFICATION SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}✓ Passed:  $PASSED${NC}"
if [ $FAILURES -gt 0 ]; then
  echo -e "  ${RED}✗ Failed:  $FAILURES${NC}"
fi
if [ $SKIPPED -gt 0 ]; then
  echo -e "  ${YELLOW}⊘ Skipped: $SKIPPED${NC}"
fi
echo -e "  Total:   $TOTAL checks in ${TOTAL_ELAPSED}s"
echo ""

if [ $FAILURES -gt 0 ]; then
  echo -e "${RED}${BOLD}VERIFICATION FAILED${NC} — $FAILURES check(s) did not pass."
  exit 1
else
  echo -e "${GREEN}${BOLD}ALL CHECKS PASSED${NC}"
  exit 0
fi
