---
name: bodega-crm
description: >-
  Operate Pigeon Labs' Bodega CRM via MCP/REST: inbound leads (blog,
  partnerships, affiliates / Coo Crew), sequences, inbox, and Hunter verify.
  Use when working in TheBodegaCRM, calling Bodega MCP tools, creating/enrolling
  leads, writing sequences, triaging replies, or managing referrals/events.
---

# Bodega CRM

API-first CRM for website inbound and affiliate (Coo Crew) follow-up. Claude writes copy; Bodega stores and sends. Drive it through **MCP** (`/api/mcp`) or **REST** (`/api/v1`) with a `Bearer bdg_…` key.

Repo docs: `docs/agent-workflow.md`. Tool catalog: [reference.md](reference.md).

## Hard rules

- **One live sequence per lead.** Replies / bounces / unsubs stop enrollment automatically.
- **Verify before send or enroll.** Only `valid`, `accept_all`, or `webmail`.
- **No cold outbound via Resend.** Console channels are Blog, Web, Partnerships, Affiliates (not Cold).
- Website inbound sources use `landing:*`, `pigeonlabs_*`, or tags `blog` / `web` / `partnership` / `referral*`.
- **No `$1` / `dollar_pentest`.** That offer is dead. Use plain `pentest` if needed.
- Put research in `research` JSON so copy can use `{{research.<key>}}`.

## Shared stages

All leads (blog, partnerships, affiliates) use the same stage funnel:

`new` → `contacted` → `replied` → `interested` → `meeting_booked` → `customer`

Exits: `not_interested` | `unsubscribed` | `bounced` | `lost`

Terminal stages that stop sequences: `interested`, `meeting_booked`, `not_interested`, `customer`, `lost` (plus bounce/unsub).

## Lead channels (console filters)

| Filter | `channel` / `pipeline` | Tags | Typical source |
|--------|------------------------|------|----------------|
| Blog | `channel=blog` | `blog` (+ `blog_subscriber`) | `pigeonlabs_blog_subscription`, `landing:blog` |
| Web | `channel=web` | `web` (+ `web_inbound`) | home / pentest / playbook landing forms |
| Partnerships | `channel=partnerships` | `partnership` | `landing:partnerships` |
| Affiliates | `pipeline=referral` | `referral` (+ track) | Coo Crew |
| Influencers | `pipeline=referral_influencer` | `referral`, `referral_influencer` | `landing:affiliates` |
| Events | `pipeline=referral_event` | `referral`, `referral_event` | `event:<Name>` or `landing:events` |

## Follow-up workflow

1. **List** - `create_lead` / `bulk_import_leads`. Optional: placeholder email → `find_lead_email` → `verify_lead_email`.
2. **Sequence** - `create_sequence` with steps (delays, empty subject + `thread_with_previous` for replies, optional `condition_prompt` / `lead_magnet_id`).
3. **Proof** - `preview_sequence` with a real `lead_id`.
4. **Launch** - `update_sequence` `status=active`, then `enroll_leads`.
5. **Inbox** - `list_inbox` → `get_lead_thread` → `send_email` (`reply_to_email_id`) → `update_lead` stage → `mark_email_handled`.

Cron sends every 15 minutes inside the send window. `run_sequence_now` with `force: true` ignores the window.

## Affiliate program (Coo Crew)

Public signup is **Coo Crew** (`/affiliates`). Console filter label: **Affiliates**.

Tags / pipeline values:

| Track | `pipeline` | Tags | Source |
|-------|------------|------|--------|
| All affiliates | `referral` | `referral` (+ track) | - |
| Influencers | `referral_influencer` | `referral`, `referral_influencer` | `landing:affiliates` or outreach |
| Event-goers | `referral_event` | `referral`, `referral_event` | `event:<Name>` or `landing:events` |

Structured payload: `custom.referral = { track, event_name?, channels? }`.

Web forms: `/affiliates` (Coo Crew), `/events` (event), `/partnerships`.

### Referral links

Coo Crew + **Partnerships** leads can get a shareable code:

1. Console lead detail → **Referral** → Issue + email link (or MCP `issue_referral_code`).
2. Moving stage to `customer` also auto-issues and emails the link when missing.
3. Link shape: `https://pigeonlabs.ai/?ref=<code>` (`LANDING_BASE_URL`).
4. Site forms persist `?ref=` and stamp `referred_by_lead_id` + tag `referred` on the new lead.
5. Copy the link from the lead detail Referral panel anytime.

| Stage | Meaning |
|-------|---------|
| `new` | Captured, not contacted |
| `contacted` | Outreach / follow-up sent |
| `replied` | They replied |
| `interested` | Wants to partner |
| `meeting_booked` | Call booked |
| `customer` | Live referrer (auto-issues referral code) |

### Create - influencer

```json
{
  "email": "creator@example.com",
  "full_name": "Jane Creator",
  "source": "coo_crew_outreach",
  "tags": ["referral", "referral_influencer"],
  "custom": {
    "referral": {
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
  "tags": ["referral", "referral_event"],
  "custom": {
    "referral": { "track": "event", "event_name": "TECH WEEK" }
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
- `pipeline=referral` | `referral_influencer` | `referral_event`
- `stage`, `tag`, `q`, `campaign_id`
