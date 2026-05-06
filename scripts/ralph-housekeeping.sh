#!/bin/bash
# RALPH housekeeping — AGENTS.md stale-flag + compaction
# Called by each per-feature ralph.sh before starting a batch.
# Usage: ./ralph-housekeeping.sh <ralph-instance-dir>

set -e

RALPH_DIR="${1:-.}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

STALE_DAYS=30
COMPACTION_THRESHOLD=200

# Map RALPH instance dir to its AGENTS.md location
case "$(basename "$RALPH_DIR")" in
  ralph-atoms-molecules)
    AGENTS_FILE="$REPO_ROOT/frontend/src/components/AGENTS.md"
    ARCHIVE_FILE="$REPO_ROOT/frontend/src/components/AGENTS-archive.md"
    ;;
  ralph-features-dashboard)
    AGENTS_FILE="$REPO_ROOT/frontend/src/features/dashboard/AGENTS.md"
    ARCHIVE_FILE="$REPO_ROOT/frontend/src/features/dashboard/AGENTS-archive.md"
    ;;
  ralph-features-history)
    AGENTS_FILE="$REPO_ROOT/frontend/src/features/history/AGENTS.md"
    ARCHIVE_FILE="$REPO_ROOT/frontend/src/features/history/AGENTS-archive.md"
    ;;
  ralph-features-analytics)
    AGENTS_FILE="$REPO_ROOT/frontend/src/features/analytics/AGENTS.md"
    ARCHIVE_FILE="$REPO_ROOT/frontend/src/features/analytics/AGENTS-archive.md"
    ;;
  ralph-features-items)
    AGENTS_FILE="$REPO_ROOT/frontend/src/features/items/AGENTS.md"
    ARCHIVE_FILE="$REPO_ROOT/frontend/src/features/items/AGENTS-archive.md"
    ;;
  ralph-features-scan)
    AGENTS_FILE="$REPO_ROOT/frontend/src/features/scan/AGENTS.md"
    ARCHIVE_FILE="$REPO_ROOT/frontend/src/features/scan/AGENTS-archive.md"
    ;;
  ralph-features-settings)
    AGENTS_FILE="$REPO_ROOT/frontend/src/features/settings/AGENTS.md"
    ARCHIVE_FILE="$REPO_ROOT/frontend/src/features/settings/AGENTS-archive.md"
    ;;
  *)
    echo "Unknown RALPH instance: $(basename "$RALPH_DIR")"
    exit 1
    ;;
esac

if [ ! -f "$AGENTS_FILE" ]; then
  echo "Housekeeping: No AGENTS.md found at $AGENTS_FILE — skipping."
  exit 0
fi

echo "Housekeeping: Processing $AGENTS_FILE"

# Step 1: Flag stale entries (entries with [YYYY-MM-DD] prefix older than STALE_DAYS)
CUTOFF_DATE=$(date -d "$STALE_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${STALE_DAYS}d +%Y-%m-%d 2>/dev/null)

if [ -n "$CUTOFF_DATE" ]; then
  STALE_COUNT=0
  while IFS= read -r line; do
    # Match lines starting with - [YYYY-MM-DD] that are NOT already [STALE]
    if echo "$line" | grep -qP '^\- \[\d{4}-\d{2}-\d{2}\]' && ! echo "$line" | grep -q '\[STALE\]'; then
      ENTRY_DATE=$(echo "$line" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1)
      if [ -n "$ENTRY_DATE" ] && [[ "$ENTRY_DATE" < "$CUTOFF_DATE" ]]; then
        STALE_COUNT=$((STALE_COUNT + 1))
      fi
    fi
  done < "$AGENTS_FILE"

  if [ "$STALE_COUNT" -gt 0 ]; then
    # Add [STALE] flag to entries older than cutoff
    sed -i -E "/^\- \[[0-9]{4}-[0-9]{2}-[0-9]{2}\]/{
      /\[STALE\]/!{
        s/^\- \[([0-9]{4}-[0-9]{2}-[0-9]{2})\]/- [\1] [STALE]/
      }
    }" "$AGENTS_FILE"

    # Only flag entries actually older than cutoff (re-process to be precise)
    python3 -c "
import sys
from datetime import datetime, timedelta

cutoff = datetime.strptime('$CUTOFF_DATE', '%Y-%m-%d')
lines = open('$AGENTS_FILE').readlines()
out = []
flagged = 0
for line in lines:
    import re
    m = re.match(r'^- \[(\d{4}-\d{2}-\d{2})\](.*)$', line)
    if m:
        entry_date = datetime.strptime(m.group(1), '%Y-%m-%d')
        rest = m.group(2)
        if entry_date < cutoff and '[STALE]' not in rest:
            out.append(f'- [{m.group(1)}] [STALE]{rest}\n')
            flagged += 1
        else:
            out.append(line)
    else:
        out.append(line)
open('$AGENTS_FILE', 'w').writelines(out)
print(f'Flagged {flagged} entries as [STALE]')
" 2>/dev/null || echo "  Stale-flag: python3 not available, skipping precise dating"

    echo "  Stale-flagged $STALE_COUNT entries older than $CUTOFF_DATE"
  else
    echo "  No stale entries found."
  fi
fi

# Step 2: Compaction if file exceeds threshold
LINE_COUNT=$(wc -l < "$AGENTS_FILE")
if [ "$LINE_COUNT" -gt "$COMPACTION_THRESHOLD" ]; then
  echo "  File has $LINE_COUNT lines (threshold: $COMPACTION_THRESHOLD) — compacting..."

  # Initialize archive if needed
  if [ ! -f "$ARCHIVE_FILE" ]; then
    echo "# AGENTS.md Archive" > "$ARCHIVE_FILE"
    echo "Compacted entries from $(basename "$(dirname "$AGENTS_FILE")")" >> "$ARCHIVE_FILE"
    echo "---" >> "$ARCHIVE_FILE"
  fi

  # Move [STALE] entries to archive
  echo "" >> "$ARCHIVE_FILE"
  echo "## Compacted $(date +%Y-%m-%d)" >> "$ARCHIVE_FILE"
  grep '\[STALE\]' "$AGENTS_FILE" >> "$ARCHIVE_FILE" 2>/dev/null || true

  # Remove [STALE] lines from AGENTS.md
  grep -v '\[STALE\]' "$AGENTS_FILE" > "${AGENTS_FILE}.tmp"
  mv "${AGENTS_FILE}.tmp" "$AGENTS_FILE"

  NEW_COUNT=$(wc -l < "$AGENTS_FILE")
  echo "  Compacted: $LINE_COUNT → $NEW_COUNT lines (moved stale to archive)"
else
  echo "  File has $LINE_COUNT lines — below compaction threshold."
fi

echo "Housekeeping complete."
