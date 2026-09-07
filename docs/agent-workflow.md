# Running cold email from Claude

Bodega exposes the same operations as MCP tools (`/api/mcp`) and REST endpoints (`/api/v1`). Tool names below are the MCP names; the REST equivalent is in parentheses.

## 1. Build the list

- `create_lead` / `bulk_import_leads` (`POST /leads`, `POST /leads/bulk`). Email is the unique key. Put anything you researched into `research` (a JSON object) so it can be referenced in copy as `{{research.<key>}}`.
- If you only have a name and company: create the lead with a placeholder email, then `find_lead_email` (`POST /leads/:id/find-email`) to let Hunter fill it in.
- `verify_lead_email` (`POST /leads/:id/verify-email`) before enrolling. Leads marked `invalid` are never emailed.

## 2. Write the sequence

`create_sequence` (`POST /sequences`) accepts steps inline:

```json
{
  "name": "Fintech CTOs — pentest readiness",
  "from_email": "daniel@mail.pigeonlabs.nyc",
  "send_window": { "days": [1,2,3,4,5], "start_hour": 8, "end_hour": 17, "timezone": "America/New_York" },
  "steps": [
    { "delay_minutes": 0, "subject": "{{company_name}} attack surface", "body": "Hi {{first_name|there}},\n\n..." },
    { "delay_days": 3, "body": "Bumping this in case it got buried...\n\n" },
    { "delay_days": 4, "body": "Last one from me...", "lead_magnet_id": "<uuid>",
      "condition_prompt": "Only send if the lead has not indicated they already have a pentest vendor." }
  ]
}
```

- A step with no `subject` and `thread_with_previous: true` (the default) is sent as a reply in the same thread with `Re:` prepended.
- `body_format` is `text` by default; `markdown` and `html` are supported.
- `condition_prompt` is evaluated by the default Novita model (Settings) or `condition_model` on the step. If the model says no, the step is skipped and the sequence moves on.
- Lead magnets (`create_lead_magnet`) are Markdown documents rendered to a personalized PDF at send time and attached to the step.

Always `preview_sequence` (`GET /sequences/:id/preview?lead_id=`) for a real lead before going live. It returns every rendered subject/body, the projected send time, and any unresolved `{{tokens}}`.

## 3. Launch

- `update_sequence` with `status: "active"` (`PATCH /sequences/:id`).
- `enroll_leads` (`POST /sequences/:id/enrollments`) with `lead_ids` or `emails`. A lead already in another live sequence is skipped unless `replace_existing: true`.
- The cron sends due steps every 15 minutes inside the send window. `run_sequence_now` (`POST /sequences/:id/run`) forces a pass; add `force: true` to ignore the window.

## 4. Work the inbox

- `list_inbox` (`GET /inbox`) shows inbound replies that are not yet handled. Auto-replies are pre-marked handled.
- `get_lead_thread` (`GET /leads/:id/emails`) for the full conversation.
- `send_email` with `reply_to_email_id` (`POST /emails/send`) answers in-thread and marks the inbound handled. Without it, a new thread is started and `subject` is required.
- `update_lead` to move the stage (`interested`, `meeting_booked`, `not_interested`, ...). Stages `interested`, `meeting_booked`, `not_interested`, `customer`, `lost` stop any live sequence on the next run.
- `mark_email_handled` when nothing else is needed.

## Automatic behaviour

| Event | Effect |
| --- | --- |
| Inbound reply (Resend `email.received`) | Email stored, lead → `replied`, live enrollment → `replied` (if `stop_on_reply`). |
| Hard bounce | Lead `email_status=invalid`, stage `bounced`, enrollment → `bounced`. |
| Spam complaint or unsubscribe link | Lead `do_not_contact`, stage `unsubscribed`, enrollment → `unsubscribed`. |
| Step condition false | Step recorded as `skipped` with the model's reason; next step scheduled. |
| Resend rejects a send | Execution `failed`, retried in 30 minutes. |

## Template variables

`{{email}} {{first_name}} {{last_name}} {{full_name}} {{title}} {{company_name}} {{company}} {{company_domain}} {{company_website}} {{company_industry}} {{company_location}} {{linkedin_url}} {{research.<key>}}` — append `|fallback` to any of them, e.g. `{{first_name|there}}`.
