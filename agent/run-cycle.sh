#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
# run-cycle.sh — Orchestrates one Goose build cycle
#
# This script:
# 1. Reads the ROADMAP.md to find the next task
# 2. Runs Goose with a detailed prompt (max 60 min)
# 3. Validates the output (lint/build check)
# 4. Writes summary + milestone flag for the workflow
#
# Goose is limited to 60 min so it stops before job timeout, commits, and the next
# scheduled run continues. Prevents endless work until job timeout.
# ──────────────────────────────────────────────────────────

TASK_INPUT="${1:-auto}"
SUMMARY_FILE="/tmp/goose-summary.txt"
MILESTONE_FLAG="/tmp/goose-milestone.flag"
LOG_FILE="/tmp/goose-output.log"
GOOSE_TIMEOUT_MINUTES="${GOOSE_TIMEOUT_MINUTES:-60}"

# Clean up from any previous run
rm -f "$SUMMARY_FILE" "$MILESTONE_FLAG" "$LOG_FILE"

echo "╔══════════════════════════════════════════╗"
echo "║  🪿 Goose CRM Builder — Cycle Start      ║"
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

READ these files for context:
- ROADMAP.md — task list and phases. Pick the next [ ] or [~] task.
- .goosehints — architecture, conventions, tech stack, and quality rules. Follow them strictly.

LIVE SITE: https://the-bodega-crm.vercel.app — If you have browser/fetch access, view the deployed app to verify UI changes or debug issues when relevant.

YOUR JOB THIS CYCLE:
0. FIRST: Run 'git log -1 --oneline'. If the last commit contains '[build-broken]', run 'npm run build' and fix ALL errors before doing anything else.
1. Read ROADMAP.md and find the FIRST task that is [ ] (not started) or [~] (in progress).
2. Work on tasks in order. You may complete multiple tasks if time allows — chain through the roadmap.
3. Follow existing patterns — look at how similar features were built (e.g. contacts module for companies, contacts for deals) and replicate that structure.
4. **AFTER EACH TASK**: Run 'npm run build' and 'npm run lint'. If either fails, fix ALL errors before moving on. This is critical — do NOT move to the next task until the current one builds cleanly. Never import a module you haven't created yet.
5. When you finish each task, update ROADMAP.md — change its status to [x]. If a task is too large, do as much as you can and mark it [~].
6. Run 'npm run build' and 'npm run lint' one final time before finishing. Fix any pre-existing lint errors in files you touch.
7. TIME BUDGET: You have ~60 min max. Stop before the limit so your work gets committed. Write a summary of what you did to /tmp/goose-summary.txt before time runs out.

MILESTONE RULES — write the word MILESTONE to a file at /tmp/goose-milestone.flag if:
- You just completed an entire PHASE (all tasks in a phase are [x])
- You got the app to a state where it builds + runs successfully for the first time
- You completed a major user-facing feature (e.g., auth works, contacts CRUD works)

SUMMARY — Always write a 1-2 line summary of what you did to /tmp/goose-summary.txt

IMPORTANT RULES:
- Do NOT skip ahead in the roadmap. Do tasks IN ORDER.
- Do NOT rewrite things that already work unless they are broken.
- ALWAYS run 'npm run build' and 'npm run lint' AFTER EACH TASK. This is the #1 rule. If you complete 3 tasks without building, one broken import loses all your work.
- Never import or reference a file/module you haven't created yet. Create the file first, then import it.
- Fix ALL errors in files you modify, including pre-existing lint errors.
- Use the Supabase credentials from environment variables.
- Write clean, typed TypeScript. No 'any' types.
- Add tests for new features once Phase 8 (testing) is complete; until then, focus on implementation.

DEPENDENCY SAFETY (causes build failures if ignored):
- NEVER import a package that isn't already in package.json. Run 'npm install <package>' BEFORE creating files that use it.
- After adding a new third-party import, verify: grep '<package>' package.json. If missing, install it.
- Example: before creating a dropdown-menu.tsx that uses @radix-ui/react-dropdown-menu, first run 'npm install @radix-ui/react-dropdown-menu'.

PROVIDER SAFETY (causes runtime crashes if ignored):
- React Query hooks (useQuery, useMutation) require QueryClientProvider. It already exists in src/components/providers.tsx. Do NOT create a duplicate.
- If you add a new context/provider, add it to src/components/providers.tsx — that is the single source of truth for app-level providers.
- NEVER add hooks that depend on a provider without verifying the provider is in the component tree.

SQL MIGRATION SAFETY (causes deployment failures if ignored):
- NEVER insert seed/sample data with hardcoded UUIDs in migrations. UUIDs like '00000000-...' don't exist in auth.users and WILL violate FK constraints. Create seed data through the app, not in SQL files.
- All new tables MUST have 'org_id UUID REFERENCES organizations(id)' — this is a multi-tenant app. Data is scoped by org, not by user.
- All RLS policies MUST use: org_id IN (SELECT public.get_user_org_ids()) — NEVER use 'user_id = auth.uid()' alone. That breaks multi-tenancy.
- Check 'ls supabase/migrations/' before creating a new migration to avoid duplicate numbers.
"
else
  TASK_PROMPT="
You are an autonomous software engineer building a world-class CRM application.

READ .goosehints for architecture, conventions, and quality rules. Follow them strictly.
LIVE SITE: https://the-bodega-crm.vercel.app — View to verify UI when relevant.

YOUR SPECIFIC TASK THIS CYCLE:
${TASK_INPUT}

Follow existing patterns (e.g. how contacts/companies were built). Rules:
- Run 'npm run build' and 'npm run lint' AFTER EACH sub-task or significant change. Do NOT batch all changes and build only at the end.
- Never import or reference a file/module you haven't created yet. Create files first, then import them.
- Fix ALL errors before moving on to the next piece of work.
- Write a 1-2 line summary to /tmp/goose-summary.txt
- If this is a major milestone, write MILESTONE to /tmp/goose-milestone.flag
- Update ROADMAP.md if any tasks were completed.

SAFETY CHECKS — read .goosehints thoroughly, especially these sections:
- 'Dependency Safety': install npm packages BEFORE importing them.
- 'Provider / Context Safety': verify providers exist before adding hooks that need them.
- 'SQL Migrations': NEVER insert seed data with fake UUIDs. All tables need org_id + org-based RLS.
- 'Multi-Tenancy': use org_id in ALL queries and RLS policies, not user_id alone.
"
fi

# ──────────────────────────────────────────
# Run Goose
# ──────────────────────────────────────────

echo "🪿 Running Goose (max ${GOOSE_TIMEOUT_MINUTES} min)..."
echo ""

set +e
timeout ${GOOSE_TIMEOUT_MINUTES}m goose run \
  --no-session \
  --with-builtin developer \
  -t "$TASK_PROMPT" \
  2>&1 | tee "$LOG_FILE"
GOOSE_EXIT=${PIPESTATUS[0]}
set -e

# timeout exits 124 when timed out — that's OK, we commit what we have
if [ "${GOOSE_EXIT}" = "124" ]; then
  echo ""
  echo "⏱️  Time limit reached. Work will be committed. Next run continues."
  if [ ! -f "$SUMMARY_FILE" ]; then
    echo "Partial progress (time limit reached)" > "$SUMMARY_FILE"
  fi
fi

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
