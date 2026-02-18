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

- [x] Create SQL migration file `supabase/migrations/001_contacts.sql` — create `contacts` table: id (uuid, pk, default gen_random_uuid()), user_id (uuid, references auth.users), first_name (text, not null), last_name (text, not null), email (text), phone (text), company_id (uuid, nullable), title (text), status (text, default 'active', check in ('active','inactive','lead')), source (text), notes (text), avatar_url (text), created_at (timestamptz, default now()), updated_at (timestamptz, default now()). Add RLS policies: users can only CRUD their own contacts. Create index on user_id.
- [x] Create `src/lib/api/contacts.ts` — CRUD functions: getContacts(filters, pagination, sort), getContactById(id), createContact(data), updateContact(id, data), deleteContact(id). All using typed Supabase client. Include search by name/email.
- [x] Create `src/app/(dashboard)/contacts/page.tsx` — contacts list page with: search bar, status filter tabs (All/Active/Inactive/Lead), sortable table (name, email, company, status, created), pagination (20 per page), "Add Contact" button
- [x] Create `src/components/contacts/contacts-table.tsx` — the table component. Clickable rows navigate to contact detail. Show avatar circle with initials if no image.
- [x] Create `src/components/contacts/contact-form.tsx` — form for create/edit contact. Fields: first name, last name, email, phone, title, company (dropdown), status (select), source, notes. Use react-hook-form + zod.
- [x] Create `src/app/(dashboard)/contacts/new/page.tsx` — new contact page using the form component
- [x] Create `src/app/(dashboard)/contacts/[id]/page.tsx` — contact detail page showing all info, with edit button, delete button (with confirmation), and activity timeline placeholder
- [x] Create `src/app/(dashboard)/contacts/[id]/edit/page.tsx` — edit contact page pre-filled with existing data
- [x] Create `src/hooks/use-contacts.ts` — React Query hooks: useContacts(filters), useContact(id), useCreateContact(), useUpdateContact(), useDeleteContact() with proper cache invalidation
- [x] Verify `npm run build` passes

---

## Phase 3: Companies Module
> Contacts belong to companies. Companies have their own views.

- [x] Create SQL migration `supabase/migrations/002_companies.sql` — create `companies` table: id (uuid pk), user_id (uuid, references auth.users), name (text not null), domain (text), industry (text), size (text, check in ('1-10','11-50','51-200','201-500','500+')), website (text), phone (text), address_line1 (text), address_city (text), address_state (text), address_country (text), logo_url (text), created_at, updated_at. RLS policies for user isolation. Index on user_id and name.
- [x] Create `src/lib/api/companies.ts` — CRUD functions similar to contacts. getCompanies should support search + industry filter.
- [x] Create `src/app/(dashboard)/companies/page.tsx` — companies list with card/grid view showing logo, name, industry, contact count, deal value
- [x] Create `src/components/companies/company-card.tsx` — card component for grid view
- [x] Create `src/app/(dashboard)/companies/new/page.tsx` — new company form
- [x] Create `src/app/(dashboard)/companies/[id]/page.tsx` — company detail: info, associated contacts list, associated deals list
- [ ] Create `src/hooks/use-companies.ts` — React Query hooks for companies
- [ ] Verify `npm run build` passes

---

## Phase 4: Deals / Pipeline
> Sales pipeline — the money feature.

- [ ] Create SQL migration `supabase/migrations/003_deals.sql` — create `deals` table: id (uuid pk), user_id (uuid), title (text not null), value (numeric(12,2)), currency (text default 'USD'), stage (text not null, check in ('lead','qualified','proposal','negotiation','closed_won','closed_lost')), contact_id (uuid references contacts), company_id (uuid references companies), expected_close_date (date), probability (integer, 0-100), notes (text), created_at, updated_at. RLS policies. Indexes on user_id, stage, contact_id, company_id.
- [ ] Create `src/lib/api/deals.ts` — CRUD + getDealsByStage() for pipeline view, getDealStats() for totals/averages
- [ ] Create `src/app/(dashboard)/deals/page.tsx` — Kanban board view of deals organized by stage. Columns: Lead → Qualified → Proposal → Negotiation → Closed Won / Closed Lost. Show deal cards with title, value, company, expected close date.
- [ ] Create `src/components/deals/pipeline-board.tsx` — the kanban board component. Drag-and-drop between columns to change stage (use HTML drag/drop API, no extra deps). Each column shows sum of deal values.
- [ ] Create `src/components/deals/deal-card.tsx` — individual deal card in the pipeline
- [ ] Create `src/app/(dashboard)/deals/new/page.tsx` — new deal form with contact/company dropdowns
- [ ] Create `src/app/(dashboard)/deals/[id]/page.tsx` — deal detail page with all info + related contact/company links
- [ ] Create `src/hooks/use-deals.ts` — React Query hooks for deals
- [ ] Verify `npm run build` passes

---

## Phase 5: Activities & Timeline
> Track interactions — calls, emails, meetings, tasks.

- [ ] Create SQL migration `supabase/migrations/004_activities.sql` — create `activities` table: id (uuid pk), user_id (uuid), type (text not null, check in ('call','email','meeting','task','note')), title (text not null), description (text), contact_id (uuid references contacts), company_id (uuid references companies), deal_id (uuid references deals), due_date (timestamptz), completed (boolean default false), completed_at (timestamptz), created_at, updated_at. RLS policies. Indexes on user_id, contact_id, type.
- [ ] Create `src/lib/api/activities.ts` — CRUD + getActivitiesByContact(contactId), getUpcomingActivities(), getOverdueActivities()
- [ ] Create `src/app/(dashboard)/activities/page.tsx` — activities list with type filter tabs, date range filter, overdue highlight
- [ ] Create `src/components/activities/activity-timeline.tsx` — vertical timeline component showing activities chronologically. Used on contact/company/deal detail pages.
- [ ] Create `src/components/activities/activity-form.tsx` — quick-add activity form (can be used inline or as modal)
- [ ] Update contact detail page to show real activity timeline
- [ ] Update deal detail page to show related activities
- [ ] Create `src/hooks/use-activities.ts` — React Query hooks for activities
- [ ] Verify `npm run build` passes

---

## Phase 6: Dashboard & Analytics
> The home page — make it useful.

- [ ] Create `src/lib/api/dashboard.ts` — aggregate queries: total contacts, total deal value, deals by stage count, conversion rate, recent activities, upcoming tasks, new contacts this month, revenue won this month
- [ ] Update `src/app/(dashboard)/page.tsx` — real dashboard with: KPI cards row (contacts, deal value, conversion rate, tasks due), deals pipeline mini-chart (horizontal bar by stage), recent activity feed (last 10), upcoming tasks list, new contacts this week
- [ ] Create `src/components/dashboard/kpi-card.tsx` — stat card with icon, label, value, and trend indicator
- [ ] Create `src/components/dashboard/pipeline-chart.tsx` — horizontal bar chart showing deal values per stage (built with plain divs + Tailwind, no chart library needed)
- [ ] Create `src/components/dashboard/recent-activity.tsx` — compact activity feed component
- [ ] Verify `npm run build` passes

---

## Phase 7: Search, Tags & Polish
> Quality of life features that make it feel complete.

- [ ] Create `src/components/search/global-search.tsx` — command palette (Cmd+K) that searches across contacts, companies, and deals. Overlay modal with keyboard navigation.
- [ ] Add global search trigger to the header component
- [ ] Create SQL migration `supabase/migrations/005_tags.sql` — create `tags` table (id, user_id, name, color) and `contact_tags` junction table (contact_id, tag_id). RLS policies.
- [ ] Create `src/components/contacts/tag-badge.tsx` and tag management on contact detail pages
- [ ] Add loading skeletons to all list pages (contacts, companies, deals, activities)
- [ ] Add toast notification system for success/error feedback on all CRUD operations
- [ ] Add empty states with illustrations (SVG) for all list pages when there's no data
- [ ] Create `src/app/(dashboard)/settings/page.tsx` — basic settings page: user profile (name, email), account section
- [ ] Final UI polish pass: consistent spacing, hover states, transitions, responsive design (mobile sidebar collapse)
- [ ] Verify `npm run build` passes with zero errors and zero warnings

---

## Phase 8: Testing & Hardening
> Make it production-worthy.

- [ ] Install testing deps: `vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom`
- [ ] Create `vitest.config.ts` with proper Next.js + React setup
- [ ] Write tests for all API functions in `src/lib/api/` — mock Supabase client, test CRUD operations
- [ ] Write tests for contact-form validation (zod schemas)
- [ ] Write tests for deal stage transitions
- [ ] Add `npm run test` script to package.json
- [ ] Run full test suite — fix any failures
- [ ] Run `npm run build` — fix any errors
- [ ] Create comprehensive README.md with: project description, tech stack, setup instructions, env vars needed, deployment guide

---

## COMPLETION NOTES FOR THE AGENT

When ALL phases are done:
1. Mark this section with [x] ALL PHASES COMPLETE
2. Write MILESTONE to /tmp/goose-milestone.flag
3. The final merge to main will trigger Vercel deployment
4. The CRM is live 🚀

- [ ] ALL PHASES COMPLETE
