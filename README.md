# ResearchPilot

ResearchPilot is an AI-powered research workspace designed to find, verify, and explain evidence behind complex questions.

This repository is being built in controlled phases. The current checkpoint is **Phase 3 — Research Planner**: ResearchPilot can validate a question and produce a structured planning outline, while web search and evidence collection remain intentionally disabled.

## Run locally

Requirements:

- Node.js 20+
- pnpm 10+

Install dependencies:

```bash
pnpm install
```

Start the API service:

```bash
pnpm --filter @workspace/api-server run dev
```

Start the frontend in a second terminal:

```bash
pnpm --filter @workspace/researchpilot run dev
```

The Replit-managed workflows provide the required `PORT` and `BASE_PATH` values. The API health response is available through the shared proxy at:

- `/api/health`
- `/api/healthz`

## Project map

```text
artifacts/
├── api-server/       # Shared Express API service
└── researchpilot/    # React + Vite product frontend
lib/
├── api-spec/         # OpenAPI source of truth
├── api-client-react/ # Generated React Query client
└── api-zod/          # Generated server validation schemas
BUILD_STATUS.md       # Recoverable phase-by-phase project state
```

## Environment variables

Use `.env.example` as the safe template. Do not commit `.env` or provider credentials. The Gemini API key is stored through the workspace secret manager. The AI test route uses it server-side and never returns or logs it.

## Architecture direction

The intended research flow is:

```text
Question → Planner → Search → Source reading → Evidence → Claims
         → Conflict detection → Synthesis → Cited report
```

Provider-specific work is kept behind internal service interfaces so the AI and search providers can be replaced without rewriting the research pipeline. The first adapter is Gemini.

## Phase recovery

If work resumes in a new environment, read `BUILD_STATUS.md`, then inspect the existing source and run the relevant checks before continuing. That file is the source of truth for the last genuinely completed phase; do not infer progress from chat history.

## Cost and limitations

ResearchPilot is designed around open-source tooling and available free tiers for the MVP. External API and hosting quotas apply, and free usage is not unlimited. The Phase 3 build makes external Gemini calls through the provider verification and research planning routes.