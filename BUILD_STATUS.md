# ResearchPilot Build Status

## Current phase

**Phase 16 — Error Handling and UX Polish**

## Completed phases

- Phase 0 — Project Inspection & Foundation
- Phase 1 — Backend Foundation
- Phase 2 — AI Provider
- Phase 3 — Research Planner
- Phase 4 — Web Search (implementation complete; live provider check pending)
- Phase 5 — Webpage Extraction
- Phase 6 — Source Classification
- Phase 7 — Evidence Extraction
- Phase 8 — Claim Analysis and Conflict Detection
- Phase 9 — Evidence Synthesis
- Phase 10 — Complete Research Pipeline
- Phase 11 — Frontend Foundation
- Phase 12 — Research Workspace
- Phase 13 — Source Interface
- Phase 14 — Final Report Interface
- Phase 15 — Frontend/Backend Integration
- Phase 16 — Error Handling and UX Polish

## Current implementation status

- The React + Vite app is a research workspace: home question form, local history, and `/research/:researchId`.
- The frontend calls `POST /api/research` and `GET /api/research/{researchId}` through the generated client. Vite proxies `/api` to `API_ORIGIN`.
- While a run is in flight, the UI shows a waiting state. Stage markers are taken from the backend `progress` array after the API returns; they are not simulated.
- Source cards show classification, quality, read status, open-source links, and exact extracted passages distinct from summaries.
- The report UI renders executive summary, findings, sub-questions, conflicts, limitations, conclusion, and citation links that only resolve to collected source URLs.
- Duplicate submissions are blocked while a run is pending. 400/404/429/500/503 and timeouts map to user-facing errors. Partial results show a dedicated banner.
- Gemini and Brave keys are not used in the frontend.
- Authentication, analytics, evaluation, and HTTP rate limiting remain later phases.

## Files added or modified

- `artifacts/researchpilot/src/App.tsx` — routes for home and research workspace
- `artifacts/researchpilot/src/pages/home.tsx`, `research.tsx`, `not-found.tsx`
- `artifacts/researchpilot/src/components/layout/site-header.tsx`
- `artifacts/researchpilot/src/components/research/*`
- `artifacts/researchpilot/src/hooks/use-research-runner.ts`
- `artifacts/researchpilot/src/lib/citations.ts`, `api-errors.ts`, `research-history.ts`, `progress.ts`
- `artifacts/researchpilot/vite.config.ts` — `/api` proxy
- `pnpm-workspace.yaml` — Darwin ARM64 Rollup/Lightningcss/Tailwind/esbuild native binaries no longer forced off
- `.env.example`, `README.md`

## Tests completed

- Frontend typecheck PASS
- `pnpm --filter @workspace/researchpilot run test` — 2/2 citation grounding tests PASS
- API typecheck and `pnpm --filter @workspace/api-server run test` — 14/14 PASS
- Frontend production build PASS on Darwin ARM64 after restoring `@rollup/rollup-darwin-arm64`
- Browser: home loads, API connected, empty-question validation, 503 when providers are unconfigured, 404 for unknown research IDs, mobile header no longer overlaps the brand
- Live Gemini + Brave `POST /api/research` NOT TESTED (keys unset)

## Test result

PASS for Phases 11–16 UI and integration against the running API without provider secrets. Live cited-report generation is NOT TESTED.

## Known issues

- Research runs remain in-memory on the API and disappear on restart.
- POST `/api/research` is synchronous, so live stage ticks are unavailable until the response returns.
- HTTP rate limiting is still config-only (Phase 17).
- Full source/report screens need a successful pipeline run with Gemini and Brave.

## Required environment variables

- API: `PORT`, `GEMINI_API_KEY`, `SEARCH_API_KEY` for live research
- Frontend: `PORT`, `BASE_PATH`, `API_ORIGIN` (Vite proxy). Never put provider keys in the browser env.

## Next phase

Phase 17 — Rate Limiting
