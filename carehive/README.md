# CAREHIVE — Agentic AI Chronic Care Assistant

Production-grade prototype: multi-agent orchestration, proactive interventions, real-time updates.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind, Zustand, Recharts
- **Backend:** Node.js, Express, TypeScript, Prisma
- **AI:** Modular agent system (Care, Lifestyle, Emotional, Clinician) + optional OpenAI
- **DB:** Supabase (PostgreSQL)
- **Real-time:** Socket.io

## Quick start

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **Create tables:** In the dashboard go to **SQL Editor**, run the schema in `carehive/backend/supabase/schema.sql` (creates `users`, `health_logs`, `interventions`).
3. **Get API keys:** Go to **Project Settings → API**. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (under Project API keys) → `SUPABASE_SERVICE_KEY` (use only on backend, never expose in frontend)
4. Create `carehive/backend/.env`:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
# Optional: SEA-LION API for chat/summaries (get key from https://sea-lion.ai/try-sea-lion/)
SEA_LION_API_KEY=
```

### 2. Install and seed

```bash
cd carehive
npm install
cd backend && npm run db:seed
```

### 3. Run

**Terminal 1 — Backend**

```bash
cd carehive/backend && npm run dev
```

**Terminal 2 — Frontend**

```bash
cd carehive/frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
carehive/
├── frontend/     # Next.js app
├── backend/      # Express API + agents + Socket.io
└── shared/       # Types and schemas
```

## API

- `POST /api/health/log` — Log health (medication, steps, mood)
- `GET /api/health/history?userId=` — History
- `GET /api/insights?userId=` — Insights
- `POST /api/insights/orchestrate?userId=` — Run orchestrator (creates interventions, pushes via WS)
- `GET /api/clinician/summary?userId=` — Clinician summary
- `GET /api/agents/activity?userId=` — Agent activity / interventions
- `POST /api/chat` — Chat with AI

## Agents

1. **CareAgent** — Adherence, missed doses, reminders
2. **LifestyleAgent** — Diet/exercise (Singapore context)
3. **EmotionalAgent** — Mood/stress patterns
4. **ClinicianAgent** — Weekly summary report

Orchestrator runs all agents, merges outputs, dedupes and prioritises interventions.

## Demo data

Seed creates one user and 7 days of logs (including missed medication and mood drop) so adherence prediction and interventions trigger realistically.

---

*Demo only. Not medical advice. No sensitive data.*
