#!/bin/bash
# Ralph — per-feature AI agent loop (atoms + molecules)
# Usage: ./ralph.sh [--tool amp|claude] [max_iterations]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run pre-batch housekeeping (AGENTS.md stale-flag + compaction)
if [ -f "$REPO_ROOT/scripts/ralph-housekeeping.sh" ]; then
  bash "$REPO_ROOT/scripts/ralph-housekeeping.sh" "$SCRIPT_DIR"
fi

# Check outer-loop cost cap before starting
if [ -f "$REPO_ROOT/scripts/ralph-cost-tracker.sh" ]; then
  if ! bash "$REPO_ROOT/scripts/ralph-cost-tracker.sh" check; then
    echo "RALPH paused: MAX_USD_PER_DAY cap reached. Resuming next UTC day."
    exit 0
  fi
fi

# Parse arguments
TOOL="claude"
MAX_ITERATIONS=10
MAX_USD_PER_BATCH="${MAX_USD_PER_BATCH:-5}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Validate prd.json before starting
if [ -f "$PRD_FILE" ]; then
  # Check for circular deps and missing dep references
  VALIDATION=$(node -e "
    const prd = require('$PRD_FILE');
    const ids = new Set(prd.userStories.map(s => s.id));
    const errors = [];
    for (const s of prd.userStories) {
      for (const dep of (s.deps || [])) {
        if (!ids.has(dep)) errors.push('Story ' + s.id + ' depends on non-existent ' + dep);
      }
      if (!['ralph-eligible','ralph-eligible-with-deps','human-authored'].includes(s.tier_suitability || 'ralph-eligible')) {
        errors.push('Story ' + s.id + ' has invalid tier_suitability: ' + s.tier_suitability);
      }
    }
    if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
    console.log('prd.json validated: ' + prd.userStories.length + ' stories');
  " 2>&1) || { echo "PRD validation failed: $VALIDATION"; exit 1; }
  echo "$VALIDATION"
fi

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    DATE=$(date +%Y-%m-%d)
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^rebuild/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if needed
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph (atoms-molecules) — Tool: $TOOL — Max iterations: $MAX_ITERATIONS — Cost cap: \$$MAX_USD_PER_BATCH/batch"

BATCH_COST=0

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL) — atoms-molecules"
  echo "==============================================================="

  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
  else
    OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/prompt.md" 2>&1 | tee /dev/stderr) || true
  fi

  # Extract iteration cost from output (Claude Code emits cost in summary)
  ITER_COST=$(echo "$OUTPUT" | grep -oP 'cost[_:]?\s*\$?(\d+\.?\d*)' | grep -oP '\d+\.?\d*' | tail -1 || echo "0")
  BATCH_COST=$(echo "$BATCH_COST + ${ITER_COST:-0}" | bc 2>/dev/null || echo "$BATCH_COST")

  # Log cost to progress file
  echo "## [$(date '+%Y-%m-%d %H:%M')] - Iteration $i - cost_usd: \$${ITER_COST:-0.00}" >> "$PROGRESS_FILE"

  # Check batch cost cap
  if [ "$(echo "$BATCH_COST >= $MAX_USD_PER_BATCH" | bc 2>/dev/null)" = "1" ]; then
    echo ""
    echo "## [$(date '+%Y-%m-%d %H:%M')] - BATCH-COST-CAP-HIT - \$$BATCH_COST consumed across $i iterations" >> "$PROGRESS_FILE"
    echo "Batch cost cap reached (\$$BATCH_COST >= \$$MAX_USD_PER_BATCH). Clean exit."
    exit 0
  fi

  # Check completion
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph (atoms-molecules) completed all tasks at iteration $i!"
    exit 0
  fi

  # Re-check outer-loop cost cap between iterations
  if [ -f "$REPO_ROOT/scripts/ralph-cost-tracker.sh" ]; then
    if ! bash "$REPO_ROOT/scripts/ralph-cost-tracker.sh" check; then
      echo "## [$(date '+%Y-%m-%d %H:%M')] - DAILY-COST-CAP-HIT - pausing" >> "$PROGRESS_FILE"
      echo "RALPH paused: MAX_USD_PER_DAY cap reached."
      exit 0
    fi
  fi

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph (atoms-molecules) reached max iterations ($MAX_ITERATIONS)."
echo "Check $PROGRESS_FILE for status."
exit 1
