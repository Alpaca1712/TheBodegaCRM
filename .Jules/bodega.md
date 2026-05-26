## 2026-04-11 - Email Quality & Strategy Consolidation
**Learning:** Found that AI Strategy (conversation_next_step) was effectively "hidden" in the Overview tab while users were drafting in the Emails tab, creating a fragmenting loop. Also, manual edits in the UI bypassed quality rules applied during generation.
**Action:** Centralized quality logic in `src/lib/ai/quality.ts` for use in both API and Frontend. Surfaced AI Strategy directly in the EmailGenerator with an "Apply" button to tighten the loop from analysis to outreach.

## 2026-04-12 - Research & Prep Workflow Integration
**Learning:** Found that requiring users to navigate to individual lead pages to trigger research or meeting prep created a bottleneck in the GTM loop. Surfacing these as "Next Actions" in the Follow-Up Suggestions panel increased the velocity of moving leads from 'researched' to 'outreach ready'.
**Action:** Integrated 'run_research' and 'prep_meeting' actions directly into the Follow-Up Suggestions UI with background AI handlers and per-lead loading indicators. Updated the research-lead API to support auto-updating leads via leadId to enable this one-click workflow.

## 2026-04-13 - Centralized AI Outreach Service & Magic Drafting
**Learning:** Found that duplicate prompt logic across `generate-email` and `generate-followup` made it hard to enforce quality consistently. Also, users had to click too many times to get from "suggested action" to "saved draft".
**Action:** Centralized all AI generation in `src/lib/ai/email-service.ts`. Implemented a "Magic Draft" endpoint that generates two variants, picks the best based on `checkEmailQuality`, and saves it as a draft in one click. This pattern significantly reduces friction in the lead to draft transition.

## 2026-05-03 - One-Click Magic Draft Workflow
**Learning:** Found that while the Email Generator sheet is powerful, founders often know which lead they want to ping next but don't want to spend 30s in the editor for every follow-up. Background drafting (Magic Draft) with auto-variant selection and quality scoring bridges the gap between "bulk spam" (bad) and "manual per-lead drafting" (slow).
**Action:** Implemented POST /api/ai/draft-next-step to handle background drafting. Integrated a 'Zap' icon in FollowUpSuggestions to trigger this one-click flow, moving leads to 'email_drafted' for a final quick review.

## 2026-05-09 - Magic Draft & Outreach Centralization
**Learning:** Found that fragmented outreach logic across multiple API routes hindered the ability to implement high-leverage background actions. Moving prompts and generation logic into a shared service enabled the "Magic Draft" feature, which significantly reduces the friction of moving leads through the pipeline.
**Action:** Centralized all SMYKM and Hormozi outreach logic in `src/lib/ai/email-service.ts`. Implemented the `POST /api/ai/draft-next-step` API for automated, quality-gated background drafting. Surfaced "Magic Draft" (Zap icon) across the Outreach Command Center and Pipeline Health dashboard to tighten the GTM loop.

## 2026-05-26 - Meeting Intelligence Sync & Dashboard Prioritization
**Learning:** Found that meeting summaries and next steps were trapped in the interaction log, requiring manual copy-paste for recaps. Syncing AI-generated 'next steps' directly back to the lead record enables high-velocity post-meeting workflows.
**Action:** Updated `meeting-summary` API to auto-sync intelligence to the `leads` table. Elevated `meeting-recap` action priority in the dashboard and enabled one-click "Magic Draft" (Zap icon) for leads in the `meeting_held` stage to bridge the "meeting to follow-up" gap.
