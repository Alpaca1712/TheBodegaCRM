# TODO

## Completed Tasks

- [x] Add bulk actions to contacts list (bulk tag, bulk delete, bulk status change)
- [x] Created bulk API functions in contacts.ts: bulkDeleteContacts, bulkUpdateContacts, bulkTagContacts
- [x] Updated Contact interface to include tags field
- [x] Enhanced contacts-table.tsx with selection checkboxes and bulk actions toolbar
- [x] Implemented selection state management and bulk action handlers
- [x] Verified build and lint pass with no errors
- [x] Enhanced search: filter by tag, date range, custom fields
- [x] Mobile responsive improvements (sidebar collapses to icons, table becomes cards)
- [x] Keyboard shortcuts (cmd+k for search, ? for help dialog, g+d/g+c navigation)
- [x] Theme toggle (light/dark mode) using custom ThemeProvider
- [x] Export data (contacts, companies, deals) as CSV
- [x] Contact enrichment via Apollo.io API (enrich with LinkedIn, title, phone, company)
- [x] AI Lead Scoring on contact detail page
- [x] Unified Timeline (activities + emails + deals) on contact detail
- [x] Sequences (multi-step email campaigns like Apollo.io)
- [x] Automations (trigger-based workflow automation)
- [x] Analytics dashboard with real data (revenue by month, funnel, LTV/CAC)
- [x] CSV contact import with field mapping
- [x] Investor edit button added to detail page

## Remaining Ideas

- [ ] Keyboard-accessible menus (focus traps, arrow key navigation in dropdowns)
- [ ] Webhook integrations (Slack, Zapier)
- [ ] Email template library
- [ ] Custom fields for contacts/deals
- [ ] Team/user assignment on deals and activities
- [ ] Calendar view for activities
