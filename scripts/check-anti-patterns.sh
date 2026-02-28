#!/usr/bin/env bash
# SafetyWallet Anti-Pattern Guard
# Blocks commits containing forbidden patterns defined in AGENTS.md
# Usage: bash scripts/check-anti-patterns.sh <file1> <file2> ...
set -euo pipefail

ERRORS=0

for file in "$@"; do
  # Skip test files — they may legitimately reference anti-patterns
  if [[ "$file" == *".test."* ]] || [[ "$file" == *"__tests__"* ]] || [[ "$file" == *".spec."* ]] || [[ "$file" == */scripts/* ]] || [[ "$file" == "scripts/"* ]]; then
    continue
  fi

  # 1. No 'as any' type casts
  if grep -nP '\bas\s+any\b' "$file" 2>/dev/null; then
    echo "  BLOCKED: 'as any' in $file"
    ERRORS=$((ERRORS + 1))
  fi

  # 2. No @ts-ignore / @ts-expect-error
  if grep -nE '@ts-ignore|@ts-expect-error' "$file" 2>/dev/null; then
    echo "  BLOCKED: '@ts-ignore' or '@ts-expect-error' in $file"
    ERRORS=$((ERRORS + 1))
  fi

  # 3. No console.log in production code
  if grep -nP 'console\.log\(' "$file" 2>/dev/null; then
    echo "  BLOCKED: 'console.log' in $file"
    ERRORS=$((ERRORS + 1))
  fi

  # 4. No native browser dialogs
  if grep -nE 'window\.(alert|confirm)\(' "$file" 2>/dev/null; then
    echo "  BLOCKED: Native dialog (window.alert/confirm) in $file"
    ERRORS=$((ERRORS + 1))
  fi

  # 5. No empty catch blocks
  if grep -PzoN 'catch\s*\([^)]*\)\s*\{\s*\}' "$file" 2>/dev/null; then
    echo "  BLOCKED: Empty catch block in $file"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "COMMIT BLOCKED: $ERRORS anti-pattern violation(s) found."
  echo "See AGENTS.md for project constraints."
  exit 1
fi
