#!/usr/bin/env bash
# Verify the production frontend bundle contains no Storybook / mockup artifacts.
# Pivot plan Phase 8 — runs as a CI gate before deploy.
#
# Storybook stories are excluded from `vite build` because no production code
# imports from `*.stories.*` files (enforced by scripts/check-no-story-imports.sh).
# This script confirms the exclusion held in the EMITTED bundle, not just at
# source-import time.
#
# Run: scripts/check-prod-bundle.sh [path-to-dist]
#  - default dist path: frontend/dist
#  - exit 0 if all checks pass
#  - exit 1 on any leak
#
# Pre-condition: `cd frontend && npm run build` has produced the dist/.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${1:-$ROOT/frontend/dist}"

if [[ ! -d "$DIST" ]]; then
  echo "ERROR: dist directory not found at $DIST"
  echo "Run: cd frontend && npm run build"
  exit 1
fi

echo "Checking $DIST for Storybook / mockup leakage..."
echo

cd "$DIST"

leaks=0

# CHECK 1: Story files
echo -n "  [1/6] Story files (*.stories.*)... "
matches=$(find . -name "*.stories.*" -o -name "*.story.*" 2>/dev/null | head -10 || true)
if [[ -n "$matches" ]]; then
  echo "FAIL"
  echo "$matches" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "ok"
fi

# CHECK 2: Storybook framework references
echo -n "  [2/6] Storybook framework refs (@storybook, @ladle)... "
matches=$(grep -rl "@storybook\|@ladle/react" --include="*.js" --include="*.mjs" --include="*.html" --include="*.css" 2>/dev/null | head -5 || true)
if [[ -n "$matches" ]]; then
  echo "FAIL"
  echo "$matches" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "ok"
fi

# CHECK 3: Tailwind CDN reference (Phase 1 stripped this; should never come back)
echo -n "  [3/6] Tailwind CDN (cdn.tailwindcss.com)... "
matches=$(grep -rl "cdn.tailwindcss" --include="*.html" --include="*.js" 2>/dev/null | head -5 || true)
if [[ -n "$matches" ]]; then
  echo "FAIL"
  echo "$matches" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "ok"
fi

# CHECK 4: Atom showcase content (frontend/src/_design/)
echo -n "  [4/6] Atom showcase (_design/Colors/Typography/Icons)... "
matches=$(grep -rlE "_design/(Colors|Typography|Icons)\.stories" --include="*.js" --include="*.mjs" --include="*.html" 2>/dev/null | head -5 || true)
if [[ -n "$matches" ]]; then
  echo "FAIL"
  echo "$matches" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "ok"
fi

# CHECK 5: Story-specific identifiers (titles + sentinel content)
# Patterns chosen to avoid false positives — these strings only appear in stories,
# not in the production app's UI copy or i18n keys.
echo -n "  [5/6] Story titles + sentinel content... "
matches=$(grep -lE "Welcome\.stories|Hello sentinel|Color Tokens —|Font Sizes —|Icons \(lucide-react\)|Atoms.{1,3}(Colors|Typography|Icons)|Screens.{1,3}(Dashboard|Trends|History)" --include="*.js" --include="*.mjs" --include="*.html" -r 2>/dev/null | head -5 || true)
if [[ -n "$matches" ]]; then
  echo "FAIL"
  echo "$matches" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "ok"
fi

# CHECK 6: Storybook config artifacts (preview decorators, custom toolbar)
echo -n "  [6/6] Storybook config (withThemeByClassName, preview-head, colorTheme toolbar)... "
matches=$(grep -lE "withThemeByClassName|preview-head|colorTheme.*toolbar" --include="*.js" --include="*.html" -r 2>/dev/null | head -5 || true)
if [[ -n "$matches" ]]; then
  echo "FAIL"
  echo "$matches" | sed 's/^/    /'
  leaks=$((leaks + 1))
else
  echo "ok"
fi

echo

if [[ $leaks -gt 0 ]]; then
  echo "FAIL: $leaks check(s) failed."
  echo "Storybook / mockup artifacts leaked into the production bundle."
  echo "Investigate the matched files; likely cause is production code importing"
  echo "from *.stories.* (run scripts/check-no-story-imports.sh to find the source)."
  exit 1
fi

echo "PASS: production bundle is clean of Storybook / mockup leakage."
echo "  - 0 story files in dist/"
echo "  - 0 framework references (@storybook / @ladle)"
echo "  - 0 Tailwind CDN references"
echo "  - 0 atom showcase content"
echo "  - 0 story-specific identifiers"
echo "  - 0 Storybook config artifacts"
