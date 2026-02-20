# 🪿 CRM Roadmap — Autonomous Build Plan

> This file is read by the Goose agent every cycle. It picks the next `[ ]` task and works on it.
> When a task is done, the agent marks it `[x]`. In-progress tasks are `[~]`.
> **DO NOT reorder tasks.** They are sequenced for dependency reasons.

---

## Phase 0: Project Scaffold
> Foundation — nothing works until this is done.

- [x] Initialize Next.js 14 app with TypeScript, Tailwind CSS, and App Router (`npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*" --use-npm`). Make sure the project is in the REPO ROOT, not a subfolder. If package.json already exists at root, skip this step.
- [x] Install core dependencies: `@supabase/supabase-js @supabase/ssr zustand @tanstack/react-query lucide-react date-fns zod react-hook-form @hookform/resolvers`
- [x] Install dev dependencies: `@types/node prettier`
- [x] Create `src/lib/supabase/client.ts` — browser Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- [x] Create `src/lib/supabase/server.ts` — server-side Supabase client for Server Components and Route Handlers using `@supabase/ssr`
- [x] Create `src/lib/supabase/middleware.ts` — Supabase auth middleware helper
- [x] Create `src/middleware.ts` — Next.js middleware that refreshes auth session on every request
- [x] Create `.env.local.example` with all required env var names (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [x] Create `src/types/database.ts` — TypeScript types for all Supabase tables (define types for: profiles, contacts, companies, deals, activities, notes, tags, contact_tags)
- [x] Verify `npm run build` passes with zero errors

---

## Phase 1: Auth System
> Users must be able to sign up, log in, and have protected routes.

- [x] Create `src/app/(auth)/login/page.tsx` — login page with email/password form using react-hook-form + zod validation. Clean, modern UI with Tailwind. Include "Sign up" link.
- [x] Create `src/app/(auth)/signup/page.tsx` — signup page with email/password/name. Validate with zod. On success, show "check your email" message.
- [x] Create `src/app/(auth)/callback/route.ts` — Supabase auth callback route handler (exchanges code for session)
- [x] Create `src/components/auth/auth-form.tsx` — shared form component used by both login and signup
- [x] Create protected route group `src/app/(dashboard)/layout.tsx` — checks for auth session, redirects to /login if not authenticated. Include basic sidebar shell.
- [x] Create `src/app/(dashboard)/page.tsx` — placeholder dashboard home (just says "Welcome to TheBodegaCRM" for now)
- [x] Create `src/components/layout/sidebar.tsx` — navigation sidebar with links: Dashboard, Contacts, Companies, Deals, Activities. Use lucide-react icons.
- [x] Create `src/components/layout/header.tsx` — top header bar with user avatar/email dropdown and sign-out button
- [x] Create `src/lib/auth/actions.ts` — server actions for signIn, signUp, signOut using Supabase
- [x] Verify `npm run build` passes. Test that auth flow compiles correctly.

---

## Phase 2: Contacts Module
> Core CRM feature — managing contacts.

- [x] Create SQL migration file `supabase/migrations/001_contacts.sql`
- [x] Create `src/lib/api/contacts.ts` — CRUD functions
- [x] Create `src/app/(dashboard)/contacts/page.tsx` — contacts list page
- [x] Create `src/components/contacts/contacts-table.tsx`
- [x] Create `src/components/contacts/contact-form.tsx`
- [x] Create `src/app/(dashboard)/contacts/new/page.tsx`
- [x] Create `src/app/(dashboard)/contacts/[id]/page.tsx`
- [x] Create `src/app/(dashboard)/contacts/[id]/edit/page.tsx`
- [x] Create `src/hooks/use-contacts.ts`
- [x] Verify `npm run build` passes

---

## Phase 3: Companies Module

- [x] Create SQL migration `supabase/migrations/002_companies.sql`
- [x] Create `src/lib/api/companies.ts`
- [x] Create `src/app/(dashboard)/companies/page.tsx`
- [x] Create `src/components/companies/company-card.tsx`
- [x] Create `src/app/(dashboard)/companies/new/page.tsx`
- [x] Create `src/app/(dashboard)/companies/[id]/page.tsx`
- [x] Create `src/hooks/use-companies.ts`
- [x] Verify `npm run build` passes

---

## Phase 4: Deals / Pipeline

- [x] Create SQL migration `supabase/migrations/003_deals.sql`
- [x] Create `src/lib/api/deals.ts`
- [x] Create `src/app/(dashboard)/deals/page.tsx` — Kanban board
- [x] Create `src/components/deals/pipeline-board.tsx`
- [x] Create `src/components/deals/deal-card.tsx`
- [x] Create `src/app/(dashboard)/deals/new/page.tsx`
- [x] Create `src/app/(dashboard)/deals/[id]/page.tsx`
- [x] Create `src/hooks/use-deals.ts`
- [x] Verify `npm run build` passes

---

## Phase 5: Activities & Timeline

- [x] Create SQL migration `supabase/migrations/004_activities.sql`
- [x] Create `src/lib/api/activities.ts`
- [x] Create `src/app/(dashboard)/activities/page.tsx`
- [x] Create `src/components/activities/activity-timeline.tsx`
- [x] Create `src/components/activities/activity-form.tsx`
- [x] Update contact detail page to show real activity timeline
- [x] Update deal detail page to show related activities
- [x] Create `src/hooks/use-activities.ts`
- [x] Verify `npm run build` passes

---

## Phase 6: Dashboard & Analytics

- [x] Create `src/lib/api/dashboard.ts`
- [x] Update dashboard with KPI cards, pipeline chart, recent activity, upcoming tasks
- [x] Create dashboard components (kpi-card, pipeline-chart, recent-activity)
- [x] Verify `npm run build` passes

---

## Phase 7: Search, Tags & Polish

- [x] Create global search (Cmd+K command palette)
- [x] Create tags system with SQL migration
- [x] Add loading skeletons, toasts, empty states
- [x] Create settings page
- [x] Final UI polish
- [x] Verify `npm run build` passes

---

## Phase 8: Testing & Hardening

- [x] Install testing deps, create vitest config
- [x] Write tests for API, forms, and deal stage transitions
- [x] Run full test suite and build
- [x] Create comprehensive README.md

---

## Phase 9: Investors & Fundraising Pipeline
> Track investor relationships, investment rounds, and fundraising metrics.

- [x] Create SQL migration `supabase/migrations/006_investors.sql` — investors + investments tables with RLS
- [x] Create `src/types/database.ts` updates — add investors, investments types
- [x] Create `src/lib/api/investors.ts` — CRUD for investors + investments + stats
- [x] Create `src/app/(dashboard)/investors/page.tsx` — investors list with filters + stats cards
- [x] Create `src/app/(dashboard)/investors/new/page.tsx` — new investor form
- [x] Create `src/app/(dashboard)/investors/[id]/page.tsx` — investor detail with investments
- [x] Create `src/app/(dashboard)/investors/[id]/edit/page.tsx` — edit investor form
- [x] Create `src/components/investors/investment-form.tsx` — form to add investment rounds to an investor
- [x] Create `src/components/investors/investor-pipeline.tsx` — Kanban-style board for investment stages (intro → pitch → due diligence → term sheet → negotiation → closed/passed)
- [x] Create `src/hooks/use-investors.ts` — React Query hooks for investors + investments
- [x] Add investor stats to dashboard (total raised, pipeline, active conversations)
- [x] Verify `npm run build` passes

---

## Phase 10: AI Engine (Novita API)
> AI-powered deal intelligence, email summarization, and follow-up generation.

- [x] Create `src/lib/api/ai.ts` — Novita API wrapper with functions: summarizeEmail, generateFollowUp, suggestDealStage, analyzeLtvCac
- [x] Create `src/app/api/ai/summarize/route.ts` — API route for email summarization (POST)
- [x] Create `src/app/api/ai/follow-up/route.ts` — API route for follow-up generation (POST)
- [x] Create `src/app/api/ai/deal-stage/route.ts` — API route for deal stage suggestions (POST)
- [x] Create `src/components/ai/ai-summary-card.tsx` — display AI summary with sentiment badge + action items
- [x] Create `src/components/ai/follow-up-draft.tsx` — display + edit AI-generated follow-up email
- [x] Create `src/components/ai/deal-suggestion-banner.tsx` — banner on deal detail showing AI stage suggestion
- [x] Add AI insights panel to contact detail page — show recent email summaries + suggested follow-ups
- [x] Add AI insights panel to deal detail page — show stage suggestion + reasoning
- [x] Verify `npm run build` passes

---

## Phase 11: Gmail Integration (OAuth + Metadata Sync) ✅
> Connect Gmail to automatically sync email metadata and power AI features.

- [x] Create `src/lib/api/gmail.ts` — OAuth flow + metadata fetching (getGoogleAuthUrl, exchangeCodeForTokens, refreshAccessToken, fetchRecentMessages)
- [x] Create SQL migration `supabase/migrations/007_email_and_ai.sql` — email_accounts + email_summaries + acquisition_costs tables
- [x] Create `src/app/api/gmail/connect/route.ts` — redirect to Google OAuth
- [x] Create `src/app/api/gmail/callback/route.ts` — handle OAuth callback, store tokens
- [x] Create `src/app/(dashboard)/email/page.tsx` — email hub showing connected accounts + AI summaries
- [x] Create `src/app/api/gmail/sync/route.ts` — API route that fetches new messages, matches to contacts/deals, runs AI summarization via Novita
- [x] Create `src/components/email/email-summary-list.tsx` — list of email summaries with sentiment + action items
- [x] Add email thread view on contact detail page — show email history with that contact
- [x] Add email thread view on deal detail page — show emails related to that deal
- [x] Add email thread view on investor detail page — show emails related to that investor
- [x] Create background sync mechanism (cron or on-demand) for periodic email fetching
- [x] Verify `npm run build` passes

---

## Phase 12: LTV/CAC & Revenue Analytics
> Unit economics dashboard with acquisition cost tracking.

- [x] Add LTV/CAC metrics cards to dashboard (Customer LTV, Win Rate/CAC proxy, Avg Deal Size)
- [x] Create `acquisition_costs` table in migration 007
- [x] Create `analyzeLtvCac` function in `src/lib/api/ai.ts`
- [x] Create `src/app/(dashboard)/analytics/page.tsx` — dedicated analytics page with: LTV trend, CAC by source, LTV:CAC ratio chart, revenue by month, deal conversion funnel
- [x] Create `src/components/analytics/ltv-cac-chart.tsx` — visual LTV vs CAC comparison
- [x] Create `src/components/analytics/revenue-chart.tsx` — monthly revenue bar chart (closed_won deals)
- [x] Create `src/components/analytics/conversion-funnel.tsx` — deal stage funnel visualization
- [x] Create `src/app/(dashboard)/analytics/costs/page.tsx` — acquisition cost tracking form + history
- [x] Add AI analysis to analytics page — call analyzeLtvCac and show insights
- [x] Add "Analytics" link to sidebar navigation
- [x] Verify `npm run build` passes

---

## Phase 13: UI/UX Enhancements
> Polish and features that make it feel like a real product.

- [x] Create smart reminder system — flag stale deals (no activity in 7+ days), stale contacts (no activity in 30+ days), overdue activities, upcoming follow-ups
- [x] Add bulk actions to contacts list (bulk tag, bulk delete, bulk status change)
- [ ] Create email templates system — save + reuse follow-up templates
- [ ] Add keyboard shortcuts throughout (Cmd+N for new, Cmd+K for search, etc.)
- [ ] Add data export (CSV) for contacts, companies, deals
- [ ] Create onboarding flow for new users — guided setup wizard
- [ ] Add dark mode support
- [ ] Mobile-responsive improvements — bottom nav on mobile, swipe actions on lists
- [ ] Add notification badges to sidebar (overdue tasks, stale deals)
- [ ] Performance optimization — implement virtual scrolling for large lists
- [ ] Verify `npm run build` passes

---

## COMPLETION NOTES FOR THE AGENT

When ALL phases are done:
1. Mark this section with [x] ALL PHASES COMPLETE
2. Write MILESTONE to /tmp/goose-milestone.flag
3. The final merge to main will trigger Vercel deployment
4. The CRM is live 🚀

- [ ] ALL PHASES COMPLETE
