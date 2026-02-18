#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
# run-cycle.sh — Orchestrates one Goose build cycle
#
# This script:
# 1. Reads the ROADMAP.md to find the next task
# 2. Runs Goose with a detailed prompt
# 3. Validates the output (lint/build check)
# 4. Writes summary + milestone flag for the workflow
# ──────────────────────────────────────────────────────────

TASK_INPUT="${1:-auto}"
SUMMARY_FILE="/tmp/goose-summary.txt"
MILESTONE_FLAG="/tmp/goose-milestone.flag"
LOG_FILE="/tmp/goose-output.log"

# Clean up from any previous run
rm -f "$SUMMARY_FILE" "$MILESTONE_FLAG" "$LOG_FILE"

echo "╔══════════════════════════════════════════╗"
echo "║  🦆 Goose CRM Builder — Cycle Start      ║"
echo "║  Model: deepseek/deepseek-v3.2           ║"
echo "║  Provider: Novita AI                      ║"
echo "╚══════════════════════════════════════════╝"

# ──────────────────────────────────────────
# Build the prompt
# ──────────────────────────────────────────

if [ "$TASK_INPUT" = "auto" ]; then
  # Let Goose read the roadmap and pick the next task
  TASK_PROMPT="
You are an autonomous software engineer building a world-class CRM application.

READ the file ROADMAP.md in the repo root. It contains the project roadmap with phases
and tasks. Each task has a status: [ ] = not started, [~] = in progress, [x] = done.

YOUR JOB THIS CYCLE:
1. Read ROADMAP.md and find the FIRST task that is [ ] (not started) or [~] (in progress).
2. Work on that ONE task. Implement it fully.
3. When you finish the task, update ROADMAP.md — change its status to [x].
4. If the task is too large for one cycle, do as much as you can and mark it [~].
5. Run 'npm run build' to verify nothing is broken. Fix any errors.

MILESTONE RULES — write the word MILESTONE to a file at /tmp/goose-milestone.flag if:
- You just completed an entire PHASE (all tasks in a phase are [x])
- You got the app to a state where it builds + runs successfully for the first time
- You completed a major user-facing feature (e.g., auth works, contacts CRUD works)

SUMMARY — Always write a 1-2 line summary of what you did to /tmp/goose-summary.txt

IMPORTANT RULES:
- Do NOT skip ahead in the roadmap. Do tasks IN ORDER.
- Do NOT rewrite things that already work unless they are broken.
- Always run 'npm run build' before finishing. Fix any build errors.
- Use the Supabase credentials from environment variables.
- Write clean, typed TypeScript. No 'any' types.
- Every new feature needs at minimum one test file.
"
else
  TASK_PROMPT="
You are an autonomous software engineer building a world-class CRM application.

YOUR SPECIFIC TASK THIS CYCLE:
${TASK_INPUT}

After completing the task:
- Run 'npm run build' to verify nothing is broken.
- Write a 1-2 line summary to /tmp/goose-summary.txt
- If this is a major milestone, write MILESTONE to /tmp/goose-milestone.flag
- Update ROADMAP.md if any tasks were completed.
"
fi

# ──────────────────────────────────────────
# Run Goose
# ──────────────────────────────────────────

echo "🦆 Running Goose..."
echo ""

goose run \
  --no-session \
  --with-builtin developer \
  -t "$TASK_PROMPT" \
  2>&1 | tee "$LOG_FILE" || true

# ──────────────────────────────────────────
# Fallback summary if Goose didn't write one
# ──────────────────────────────────────────

if [ ! -f "$SUMMARY_FILE" ]; then
  echo "Automated CRM build cycle (no explicit summary)" > "$SUMMARY_FILE"
fi

echo ""
echo "════════════════════════════════════════════"
echo "Summary: $(cat $SUMMARY_FILE)"
if [ -f "$MILESTONE_FLAG" ]; then
  echo "🚀 MILESTONE REACHED — will merge to main"
fi
echo "════════════════════════════════════════════"
