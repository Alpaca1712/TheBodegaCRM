# Bodega

Pigeon Labs' API-first cold email CRM. Leads, sequences, and replies live in Supabase; Resend sends and receives the mail; Claude (or any agent) drives everything through the REST API or the MCP server. The web console is a thin read-mostly view for checking on things.

## What it does

- **Leads** with Hunter.io email finding and verification, freeform `research` JSON for whatever the agent digs up, and a strict one-live-sequence-per-lead rule.
- **Sequences** of steps with delays, send windows, `{{first_name|there}}` templating, threaded follow-ups, optional Markdown-to-PDF lead magnets, and optional natural-language send conditions evaluated by a Novita model.
- **Resend** for delivery, plus a webhook that records delivery/open/bounce events and turns inbound replies into inbox items, stops the lead's sequence, and moves the lead to `replied`.
- **MCP server** at `/api/mcp` and a REST API at `/api/v1` (spec at `/api/v1/openapi.json`), both authenticated with API keys.
- **Landing webhook** at `/api/landing/leads` for artoo.love form submissions (shared-secret protected).

There is no AI email writing in Bodega on purpose: Claude writes the copy, Bodega stores and sends it.

## Stack

Next.js 16, React 19, Supabase (Postgres + Auth, service-role access only), Resend, Hunter.io, Novita (OpenAI-compatible), `mcp-handler` + MCP SDK v2, `@react-pdf/renderer`, Vercel cron.

## Setup

1. `pnpm install`
2. `cp .env.example .env.local` and fill it in (see [Configuration](#configuration)).
3. Database. This schema replaces the old one entirely. On an existing Supabase project, open the SQL editor and run `supabase/reset.sql` (drops everything in `public`), then `supabase/migrations/0001_schema.sql`. On a fresh project or a linked CLI, `supabase db push` works too.
4. Create your console login in Supabase Auth (Dashboard → Authentication → Users → Add user). There is no sign-up page.
5. `pnpm dev`, sign in at `/login`, go to **Settings**, set the sender identity, and create an API key.

## Connecting Claude

**Claude.ai (web / desktop):** Settings → Connectors → Add custom connector. URL: `https://<your-deployment>/api/mcp`. Under request headers add `Authorization` with the value `Bearer bdg_...` (include the word Bearer and a space).

**Claude Code:**

```bash
claude mcp add --transport http bodega https://<your-deployment>/api/mcp \
  --header "Authorization: Bearer bdg_..."
```

**Codex / anything else:** use the REST API directly with the same bearer token; `/api/v1/openapi.json` describes every endpoint.

See [docs/agent-workflow.md](docs/agent-workflow.md) for the intended cold-email workflow and tool names.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database and console auth. All data access is server-side with the service role. |
| `RESEND_API_KEY` | Sending and fetching received emails. |
| `RESEND_WEBHOOK_SECRET` | Signing secret for the `/api/webhooks/resend` webhook. |
| `DEFAULT_FROM_EMAIL` | Fallback sender before Settings are saved. |
| `HUNTER_API_KEY` | Email finder / verifier. |
| `NOVITA_API_KEY` | Step conditions. Model is chosen in Settings or per step. |
| `CRON_SECRET` | Protects `/api/cron/run-sequences`. |
| `LEAD_TOKEN_SECRET` | HMAC for lead tokens (unsubscribe links, landing prefill). Must match the landing site. |
| `LANDING_WEBHOOK_SECRET` | Required header (`X-Webhook-Secret`) on landing form submissions. |
| `NEXT_PUBLIC_SITE_URL` | Public URL used in unsubscribe links. |

### Resend

1. Verify `mail.pigeonlabs.nyc` in Resend with sending (SPF/DKIM) **and receiving (MX)** records.
2. Webhooks → Add webhook → URL `https://<your-deployment>/api/webhooks/resend`, select every `email.*` event including `email.received`. Copy the signing secret into `RESEND_WEBHOOK_SECRET`.
3. Send from an address on that domain (Settings → Sender identity). Replies to it come back through the webhook.

### Vercel

`vercel.json` runs `/api/cron/run-sequences` every 15 minutes with `Authorization: Bearer $CRON_SECRET`. The runner only sends inside each sequence's send window, one enrollment at a time, and never sends to leads that replied, bounced, complained, or unsubscribed.

## Operations

- `GET /api/health` — public, reports which integrations are configured.
- `POST /api/v1/sequences/:id/run?force=true` — process due steps now, ignoring the send window.
- `GET /api/unsubscribe?token=...` — one-click unsubscribe target (also advertised via `List-Unsubscribe`).

```bash
pnpm test:run
pnpm lint
pnpm build
```

## Layout

- `src/app/api/v1` — REST routes (thin wrappers over `src/lib`)
- `src/app/api/mcp` + `src/lib/mcp/server.ts` — MCP tools
- `src/lib/sequences` — schemas, CRUD, enrollments, runner, templating, send windows
- `src/lib/email` — Resend send, inbound processing, webhook handling, rendering
- `src/lib/enrichment/hunter.ts`, `src/lib/ai/novita.ts`, `src/lib/magnets/pdf.tsx`
- `src/app/(console)` — the web console
- `supabase/migrations/0001_schema.sql` — the whole schema
