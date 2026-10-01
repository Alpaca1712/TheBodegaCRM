---
name: bodega-crm
description: >-
  Operate Pigeon Labs' Bodega CRM via MCP/REST: cold email leads, sequences,
  inbox, Hunter verify, and the affiliate pipeline (influencers + event-goers).
  Use when working in TheBodegaCRM, calling Bodega MCP tools, creating/enrolling
  leads, writing sequences, triaging replies, or managing affiliates/events.
---

# Bodega CRM

API-first cold-email CRM. Claude writes copy; Bodega stores and sends. Drive it through **MCP** (`/api/mcp`) or **REST** (`/api/v1`) with a `Bearer bdg_…` key.

Repo docs: `docs/agent-workflow.md`. Tool catalog: [reference.md](reference.md).

## Hard rules

- **One live sequence per lead.** Replies / bounces / unsubs stop enrollment automatically.
- **Verify before send or enroll.** Only `valid`, `accept_all`, or `webmail`.
- **Cold outreach sources** must not use `landing:*`, `pigeonlabs_*`, or `web_inbound` (reserved for website inbound).
- **No `$1` / `dollar_pentest`.** That offer is dead. Use plain `pentest` if needed.
- Put research in `research` JSON so copy can use `{{research.<key>}}`.

## Shared stages

All leads (cold, web, affiliate) use the same stage funnel:

`new` → `contacted` → `replied` → `interested` → `meeting_booked` → `customer`

Exits: `not_interested` | `unsubscribed` | `bounced` | `lost`

Terminal stages that stop sequences: `interested`, `meeting_booked`, `not_interested`, `customer`, `lost` (plus bounce/unsub).

## Cold email workflow

1. **List** - `create_lead` / `bulk_import_leads`. Optional: placeholder email → `find_lead_email` → `verify_lead_email`.
2. **Sequence** - `create_sequence` with steps (delays, empty subject + `thread_with_previous` for replies, optional `condition_prompt` / `lead_magnet_id`).
3. **Proof** - `preview_sequence` with a real `lead_id`.
4. **Launch** - `update_sequence` `status=active`, then `enroll_leads`.
5. **Inbox** - `list_inbox` → `get_lead_thread` → `send_email` (`reply_to_email_id`) → `update_lead` stage → `mark_email_handled`.

Cron sends every 15 minutes inside the send window. `run_sequence_now` with `force: true` ignores the window.

## Affiliate pipeline

Filter with `list_leads` `pipeline`:

| Track | `pipeline` | Tags | Source |
|-------|------------|------|--------|
| All affiliates | `affiliate` | `affiliate` (+ track) | - |
| Influencers | `affiliate_influencer` | `affiliate`, `affiliate_influencer` | `landing:affiliates` or outreach |
| Event-goers | `affiliate_event` | `affiliate`, `affiliate_event` | `event:<Name>` or `landing:events` |

Web forms: `/affiliates` (influencer), `/events` (event). Stage meanings for affiliates:

| Stage | Meaning |
|-------|---------|
| `new` | Captured, not contacted |
| `contacted` | Outreach / follow-up sent |
| `replied` | They replied |
| `interested` | Wants to partner |
| `meeting_booked` | Call booked |
| `customer` | Live affiliate referring |

### Create - influencer

```json
{
  "email": "creator@example.com",
  "full_name": "Jane Creator",
  "source": "affiliate_outreach",
  "tags": ["affiliate", "affiliate_influencer"],
  "custom": {
    "affiliate": {
      "track": "influencer",
      "channels": { "youtube": "@jane", "x": "@jane" }
    }
  },
  "stage": "new"
}
```

### Create - event-goer

```json
{
  "email": "person@example.com",
  "full_name": "Alex Met",
  "source": "event:TECH WEEK",
  "tags": ["affiliate", "affiliate_event"],
  "custom": {
    "affiliate": { "track": "event", "event_name": "TECH WEEK" }
  },
  "notes": "Met at booth. Open to referring startups.",
  "stage": "new"
}
```

## Template variables

`{{email}} {{first_name}} {{last_name}} {{full_name}} {{title}} {{company_name}} {{company}} {{company_domain}} {{company_website}} {{company_industry}} {{company_location}} {{linkedin_url}} {{research.<key>}}`

Fallback: `{{first_name|there}}`.

## Filters cheat sheet

- `channel=web_inbound` | `cold_email`
- `pipeline=affiliate` | `affiliate_influencer` | `affiliate_event`
- `stage`, `tag`, `q`, `campaign_id`
