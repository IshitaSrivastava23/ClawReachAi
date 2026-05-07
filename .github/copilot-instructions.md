# Claw Reach AI - Copilot Context & Instructions

## 🚫 CRITICAL BOUNDARIES (DO NOT VIOLATE)
* [cite_start]**Scope Restriction:** This repository is EXCLUSIVELY for the Next.js frontend application, backend API routes, and Supabase schema[cite: 3].
* [cite_start]**Black-Box Architecture:** The OpenClaw worker, Python skills, and YouTube API integrations are strictly OUT OF SCOPE[cite: 4]. [cite_start]Treat OpenClaw as an external background worker[cite: 5].
* [cite_start]**No Scraping:** Do not build web scrapers, agent loops, or Python-based automation into this web application.

## 🛠️ Tech Stack Guidelines
* [cite_start]**Frontend:** Next.js 14+ (App Router)[cite: 8].
* [cite_start]**Styling/UI:** Tailwind CSS, Shadcn/UI, Lucide React[cite: 9]. [cite_start]Clean aesthetic: `bg-slate-50`, dark indigo text, Tailwind `indigo-600` accents.
* [cite_start]**Backend:** Next.js Route Handlers (`/api/*`)[cite: 10].
* [cite_start]**AI Integration:** Vercel AI SDK with OpenAI (GPT-4o-mini)[cite: 11].
* [cite_start]**Database:** Supabase (PostgreSQL) using Realtime WebSockets[cite: 12].

## 🏗️ Architectural Core Concepts
* **Layout:** The UI is an 80/20 vertical split. [cite_start]Top 80% is a CSS Grid of results; bottom 20% is a sticky chat input.
* [cite_start]**The 'Bouncer' API:** The `/api/chat` route must extract 4 specific pillars (Brand Context, Target Audience, Creator Profile, Campaign Goal) from the user. [cite_start]It must prompt the user until all 4 are gathered before writing to the database[cite: 30].
* [cite_start]**Database Operations:** Rely on a normalized 3-table architecture (`campaigns`, `influencers`, `outreach_logs`). [cite_start]Always use UUIDs[cite: 36]. [cite_start]Ensure UPSERT capabilities using the `channel_id` unique constraint on the `influencers` table.
* **Data Hydration:** The frontend listens to Supabase WebSocket `INSERT` events on the `outreach_logs` table. [cite_start]It does not poll or fetch data externally[cite: 68, 70].