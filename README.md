# 🦆 TheBodegaCRM — AI-Built CRM

> This CRM is being built autonomously by a Goose AI agent running on GitHub Actions, powered by DeepSeek V3.2 via Novita AI. Every 30 minutes, the agent picks the next task from the roadmap and builds it.

## How It Works

```
GitHub Actions (cron every 30 min)
        │
        ▼
   Goose CLI Agent
   (DeepSeek V3.2 via Novita AI)
        │
        ▼
   Reads ROADMAP.md → picks next task
        │
        ▼
   Writes code on `dev` branch
        │
        ▼
   Milestone reached? ──yes──▶ Merge to `main` ──▶ Vercel auto-deploys
        │
        no
        │
        ▼
   Wait 30 min, repeat
```

## Setup Instructions

### 1. Create the GitHub repo

Push this entire folder to an empty GitHub repo.

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL, anon key, and service role key

### 3. Get a Novita AI API key

1. Go to [novita.ai](https://novita.ai) and create an account
2. Navigate to Settings → API Keys
3. Create a new API key

### 4. Set GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value |
|---|---|
| `NOVITA_API_KEY` | Your Novita AI API key |
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://abc123.supabase.co`) |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

> `GITHUB_TOKEN` is automatically provided by GitHub Actions — you don't need to set it.

### 5. Connect Vercel

1. Import the repo in [vercel.com](https://vercel.com)
2. Set the production branch to `main`
3. Add the same Supabase env vars in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 6. Enable the workflow

The GitHub Action runs automatically every 30 minutes. You can also trigger it manually:
- Go to Actions → "🦆 Goose CRM Builder" → "Run workflow"
- Optionally provide a custom task or force a merge to main

### 7. Watch it build

- Check the Actions tab to see each cycle's progress
- Check the `dev` branch to see code being written
- When milestones are reached, `main` gets updated and Vercel deploys

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, RLS)
- **State:** Zustand + TanStack React Query
- **AI Agent:** Goose CLI + DeepSeek V3.2 via Novita AI
- **Deployment:** Vercel (auto-deploy on main)

## Project Status

See [ROADMAP.md](./ROADMAP.md) for current progress.
