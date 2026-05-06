#!/usr/bin/env bash
# Lint guard — fails if any non-story TS/TSX file imports a *.stories file.
#
# Stories must be a leaf in the dep graph; importing them from production code
# would bundle them into `frontend/dist/`, defeating the production-isolation
# guarantee of the Ladle pivot (see frontend/STORIES.md + Phase 8 safety check).
#
# Run: scripts/check-no-story-imports.sh
# CI: wire into the build pipeline; failing exit blocks merge.
# Local: invoke from /gabe-commit as a project-specific CHECK.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/frontend/src"

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: $SRC does not exist." >&2
  exit 2
fi

# Find non-story TS/TSX files, grep for imports of *.stories or *.stories.tsx.
# Match: from '.../<name>.stories' or '.../<name>.stories.tsx' (single OR double quotes).
violations=$(find "$SRC" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.stories.*" -print0 \
  | xargs -0 grep -lE "from[[:space:]]+['\"][^'\"]*\.stories(\.tsx?)?['\"]" 2>/dev/null || true)

if [[ -n "$violations" ]]; then
  echo "ERROR: Production code imports *.stories files. This would bundle stories into dist/." >&2
  echo >&2
  echo "Offending files:" >&2
  echo "$violations" >&2
  echo >&2
  echo "Fix: extract any reusable test data to *.fixtures.ts; do not import *.stories.*" >&2
  echo "from production code. See frontend/STORIES.md \"Production isolation\"." >&2
  exit 1
fi

echo "✓ No story imports leaked into production code."
