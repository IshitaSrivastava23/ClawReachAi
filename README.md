# Claw Reach AI

Claw Reach AI is a **Productivity Platforms** hackathon project for **Ramaiah Institute of Technology**. It turns manual, blind creator outreach into a guided, realtime workflow that captures a campaign brief, triggers discovery, and hydrates results as they arrive.

## Tech Stack

- Next.js 14 (App Router)
- Supabase (PostgreSQL + Realtime)
- Tailwind CSS + Shadcn/UI
- Vercel AI SDK (OpenAI provider, `gpt-4o-mini`)

## Core Architecture

### 80/20 Layout

- **Top 80%:** Results Grid (CSS Grid) for Creator Cards with independent scrolling.
- **Bottom 20%:** Sticky Chat Interface for the campaign brief and Bouncer flow.

### Bouncer API (4-Pillar Extraction)

The `/api/chat` route enforces a strict four-pillar brief before a campaign can start:

1. Brand Context
2. Target Audience
3. Creator Profile
4. Campaign Goal

If any pillar is missing, the assistant responds with a focused follow-up question. Once all four are present, the campaign is created in Supabase with a status of `ready_for_openclaw`.

### Real-Time Hydration (WebSockets)

When a campaign is active, the dashboard subscribes to Supabase Realtime `INSERT` events on `outreach_logs`. Each new insert triggers a joined query that hydrates Creator Cards in the Results Grid with live data.

### External Worker (OpenClaw)

The Next.js app communicates with an external OpenClaw worker via Tailscale. The worker is treated as a black box and is outside this repository.

## Local Development

Set environment variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Run the app:

```bash
npm install
npm run dev
```
