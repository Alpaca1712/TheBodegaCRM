# Bodega MCP / REST reference

Auth: `Authorization: Bearer bdg_…`  
MCP: `/api/mcp` · REST: `/api/v1` · Spec: `/api/v1/openapi.json`

## Tools (MCP names)

### Overview
| Tool | Purpose |
|------|---------|
| `crm_overview` | Counts by stage, sequences, due sends, inbox |

### Leads
| Tool | Purpose |
|------|---------|
| `list_leads` | Filter: `q`, `stage`, `channel`, `pipeline`, `tag`, `campaign_id`, … |
| `get_lead` | Lead + live enrollment |
| `create_lead` | Create (unique email) |
| `update_lead` | Patch fields / stage / tags |
| `delete_lead` | Permanent delete |
| `bulk_import_leads` | Upsert many (`on_conflict` skip\|update) |

### Enrichment
| Tool | Purpose |
|------|---------|
| `find_lead_email` | Hunter finder → save email |
| `verify_lead_email` | Hunter verify → `email_status` |

### Sequences
| Tool | Purpose |
|------|---------|
| `list_sequences` / `get_sequence` | Browse |
| `create_sequence` | With optional inline `steps` |
| `update_sequence` | Activate, rename, window, … |
| `add_sequence_step` / `update_sequence_step` / `delete_sequence_step` | Edit steps |
| `preview_sequence` | Render for a lead |
| `enroll_leads` | Enroll by ids or emails |
| `run_sequence_now` | Process due steps (`force` skips window) |

### Inbox / email
| Tool | Purpose |
|------|---------|
| `list_inbox` | Unhandled inbound |
| `get_lead_thread` | Full thread |
| `send_email` | One-off or reply (`reply_to_email_id`) |
| `mark_email_handled` | Clear from inbox |

### Content
| Tool | Purpose |
|------|---------|
| Campaigns, templates, lead magnets | CRUD via matching `*_campaign` / `*_template` / `*_lead_magnet` tools |

### Settings
| Tool | Purpose |
|------|---------|
| `get_settings` / `update_setting` | Sender, AI model, notifications |

## Automatic behaviour

| Event | Effect |
|-------|--------|
| Inbound reply | Store email, lead → `replied`, enrollment → `replied` if `stop_on_reply` |
| Hard bounce | `email_status=invalid`, stage `bounced`, enrollment bounced |
| Complaint / unsubscribe | `do_not_contact`, stage `unsubscribed`, enrollment stopped |
| Step `condition_prompt` false | Step `skipped`; next step scheduled |
| Resend reject | Execution `failed`; retry ~30m |

## Sequence step tips

- Empty `subject` + `thread_with_previous: true` → reply in-thread (`Re:`).
- `body_format`: `text` (default), `markdown`, `html`.
- `delay_minutes` / `delay_days` from previous step.
- `lead_magnet_id` attaches a rendered PDF at send time.
- `condition_prompt` is LLM-gated before send.

## Inbound flow keys (DB)

Seeded for landing automation (when wired): `contact`, `pentest`, `playbook`, `blog_subscribe`, `referral_influencer`, `referral_event` (Coo Crew referral program).

Never seed or use `dollar_pentest`.
