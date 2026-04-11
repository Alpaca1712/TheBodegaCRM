## 2026-04-11 - Email Quality & Strategy Consolidation
**Learning:** Found that AI Strategy (conversation_next_step) was effectively "hidden" in the Overview tab while users were drafting in the Emails tab, creating a fragmenting loop. Also, manual edits in the UI bypassed quality rules applied during generation.
**Action:** Centralized quality logic in `src/lib/ai/quality.ts` for use in both API and Frontend. Surfaced AI Strategy directly in the EmailGenerator with an "Apply" button to tighten the loop from analysis to outreach.
