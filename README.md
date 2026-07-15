# Pigeon CRM

Pigeon is a campaign-focused CRM for running outbound and inbound funnels, tracking attributed landing-page activity, automating Gmail follow-ups, and moving qualified leads into deal flow.

## Stack

- Next.js 16 and React 19
- Supabase Auth and Postgres with organization-scoped RLS
- Gmail, Google Drive, and Google Docs APIs
- Anthropic for research, email drafting, and conditional sequence rules
- Vercel for hosting and the scheduled sequence runner

## Local Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create local configuration:

   ```bash
   cp .env.example .env.local
   ```

3. Apply the Supabase migrations in `supabase/migrations` in filename order. With a linked Supabase CLI project:

   ```bash
   npx supabase db push
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

The app is available at [http://localhost:3000](http://localhost:3000).

## Required Configuration

Start from `.env.example`. Production requires these groups:

- **Supabase:** public URL, anon key, and service-role key.
- **Landing attribution:** `LEAD_TOKEN_SECRET` must exactly match Pigeon Landing. Set `ROCOTO_LANDING_URL` to the landing origin.
- **Google:** OAuth client ID, client secret, and callback URL. Enable the Gmail, Drive, and Docs APIs in the same Google Cloud project. The callback path is `/api/gmail/callback`.
- **AI:** an Anthropic API key. Model variables are optional overrides; the application defaults live in `src/lib/ai/anthropic.ts`.
- **Automation:** `CRON_SECRET` protects the scheduled sequence endpoint.

Never expose the Supabase service-role key, Google client secret, lead-token secret, or cron secret to client-side variables.

## Runtime Operations

`GET /api/health` is public and returns `healthy`, `degraded`, or `unhealthy` with capability-level configuration status. It never returns secret values. A missing Supabase configuration returns HTTP 503; optional capability outages return HTTP 200 with a degraded status.

Vercel calls `/api/campaigns/sequences/run` every 15 minutes from `vercel.json`. The runner executes campaigns sequentially to limit Gmail and database bursts, and isolates campaign failures so one expired Gmail connection does not stop other organizations.

Useful checks before deployment:

```bash
npm run test:run
npm run lint
npm run build
```

## Deployment Checklist

1. Apply all pending Supabase migrations before deploying application code.
2. Configure every production variable from `.env.example` in Vercel.
3. Confirm the Google OAuth callback matches the production domain and that Gmail, Drive, and Docs APIs are enabled.
4. Confirm Pigeon CRM and Pigeon Landing share the same `LEAD_TOKEN_SECRET` and Supabase project.
5. Check `/api/health` after deployment.
6. Run the sequence endpoint manually with `Authorization: Bearer $CRON_SECRET` and inspect its per-campaign outcome summary.

## Important Areas

- `src/app/api/campaigns`: campaign, enrollment, lead-magnet, and sequence APIs
- `src/lib/campaigns`: automation execution and campaign behavior
- `src/app/api/gmail`: OAuth, sync, and send endpoints
- `src/lib/landing-links`: signed lead attribution and landing destinations
- `src/app/api/dashboard`: CRM summary metrics and action planning
- `supabase/migrations`: database schema and cleanup history
