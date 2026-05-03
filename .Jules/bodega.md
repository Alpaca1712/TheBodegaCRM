## 2026-04-11 - Email Quality & Strategy Consolidation
**Learning:** Found that AI Strategy (conversation_next_step) was effectively "hidden" in the Overview tab while users were drafting in the Emails tab, creating a fragmenting loop. Also, manual edits in the UI bypassed quality rules applied during generation.
**Action:** Centralized quality logic in `src/lib/ai/quality.ts` for use in both API and Frontend. Surfaced AI Strategy directly in the EmailGenerator with an "Apply" button to tighten the loop from analysis to outreach.

## 2026-04-12 - Research & Prep Workflow Integration
**Learning:** Found that requiring users to navigate to individual lead pages to trigger research or meeting prep created a bottleneck in the GTM loop. Surfacing these as "Next Actions" in the Follow-Up Suggestions panel increased the velocity of moving leads from 'researched' to 'outreach ready'.
**Action:** Integrated 'run_research' and 'prep_meeting' actions directly into the Follow-Up Suggestions UI with background AI handlers and per-lead loading indicators. Updated the research-lead API to support auto-updating leads via leadId to enable this one-click workflow.

## 2026-05-03 - One-Click Magic Draft Workflow
**Learning:** Found that while the Email Generator sheet is powerful, founders often know which lead they want to ping next but don't want to spend 30s in the editor for every follow-up. Background drafting (Magic Draft) with auto-variant selection and quality scoring bridges the gap between "bulk spam" (bad) and "manual per-lead drafting" (slow).
**Action:** Implemented POST /api/ai/draft-next-step to handle background drafting. Integrated a 'Zap' icon in FollowUpSuggestions to trigger this one-click flow, moving leads to 'email_drafted' for a final quick review.
