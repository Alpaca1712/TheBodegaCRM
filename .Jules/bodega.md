## 2026-04-11 - Email Quality & Strategy Consolidation
**Learning:** Found that AI Strategy (conversation_next_step) was effectively "hidden" in the Overview tab while users were drafting in the Emails tab, creating a fragmenting loop. Also, manual edits in the UI bypassed quality rules applied during generation.
**Action:** Centralized quality logic in `src/lib/ai/quality.ts` for use in both API and Frontend. Surfaced AI Strategy directly in the EmailGenerator with an "Apply" button to tighten the loop from analysis to outreach.

## 2026-04-12 - Research & Prep Workflow Integration
**Learning:** Found that requiring users to navigate to individual lead pages to trigger research or meeting prep created a bottleneck in the GTM loop. Surfacing these as "Next Actions" in the Follow-Up Suggestions panel increased the velocity of moving leads from 'researched' to 'outreach ready'.
**Action:** Integrated 'run_research' and 'prep_meeting' actions directly into the Follow-Up Suggestions UI with background AI handlers and per-lead loading indicators. Updated the research-lead API to support auto-updating leads via leadId to enable this one-click workflow.

## 2026-04-13 - Centralized AI Outreach Service & Magic Drafting
**Learning:** Found that duplicate prompt logic across `generate-email` and `generate-followup` made it hard to enforce quality consistently. Also, users had to click too many times to get from "suggested action" to "saved draft".
**Action:** Centralized all AI generation in `src/lib/ai/email-service.ts`. Implemented a "Magic Draft" endpoint that generates two variants, picks the best based on `checkEmailQuality`, and saves it as a draft in one click. This pattern significantly reduces friction in the lead → draft transition.
