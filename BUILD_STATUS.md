# ResearchPilot Build Status

## Current phase

**Phase 10 — Complete Research Pipeline**

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

## Current implementation status

- The project has a deployable React + Vite frontend artifact at the root route. The landing page remains a Phase 0/11-era shell and is not wired to the research pipeline.
- The API service has runtime configuration, request limits, CORS, structured logging, typed errors, and health checks at `/api/healthz` and `/api/health`.
- `GET /api/ai/status` and `POST /api/ai/test` remain available for Gemini provider verification.
- `POST /api/research/plan` produces a structured research plan.
- `POST /api/search`, `POST /api/webpage/read`, and `POST /api/sources/classify` remain available.
- `POST /api/research/evidence` extracts sourced evidence, keeps exact passages separate from summaries, and drops quotations that cannot be found in the source text.
- `POST /api/research/claims` groups evidence into claims, marks insufficient/unsupported claims, and records conflicts without choosing a winner.
- `POST /api/research/synthesize` produces a cited synthesis. Citation URLs and evidence IDs are rebuilt from supplied evidence; uncited “facts” are dropped or marked interpretive.
- `POST /api/research` runs the bounded pipeline: plan → search → classify → read → extract → analyze → synthesize. Partial source failures are allowed. Runs are stored in memory for `GET /api/research/{researchId}`.
- Authentication, analytics, evaluation, and the Phase 11–15 research workspace UI are not implemented.

## Files added or modified

- `lib/api-spec/openapi.yaml` — evidence, claims, synthesis, and research-run contracts
- `lib/api-zod/` and `lib/api-client-react/` — regenerated from OpenAPI
- `artifacts/api-server/src/config.ts` — research bounds and 256kb JSON body limit
- `artifacts/api-server/src/lib/json.ts`, `text.ts`, `ai-json.ts` — shared parsing, truncation, and JSON generation
- `artifacts/api-server/src/services/evidence-extractor.ts`
- `artifacts/api-server/src/services/claim-analyzer.ts`
- `artifacts/api-server/src/services/synthesizer.ts`
- `artifacts/api-server/src/services/research-orchestrator.ts`
- `artifacts/api-server/src/services/research-store.ts`
- `artifacts/api-server/src/routes/research.ts`
- `artifacts/api-server/src/**/*.test.ts` — focused unit and mocked pipeline tests
- `.env.example` and `README.md`

## Tests completed

- API server typecheck
- API server production bundle
- `pnpm --filter @workspace/api-server run test` — 14/14 passing
- Frontend typecheck
- Health, 404, source classification, evidence validation, empty-source extraction, missing research-run, and SSRF rejection against a running API
- Live `POST /api/webpage/read` against `https://example.com/`
- Live Gemini and Brave Search were not available in this environment (`GEMINI_API_KEY` / `SEARCH_API_KEY` unset)

## Test result

PASS for Phases 7–10 with mocked providers. Live end-to-end `POST /api/research` is NOT TESTED because provider secrets were not present. Frontend production Vite build is FAIL on this Darwin host because workspace pnpm overrides omit `@rollup/rollup-darwin-arm64`; frontend typecheck PASS.

## Known issues

- Research runs are in-memory only and are lost on process restart.
- Rate-limit config exists but is not enforced as HTTP rate limiting (planned Phase 17).
- Frontend does not render progress, citations, or reports (Phases 11–15).
- Live Gemini/Brave verification remains pending when secrets are not loaded into the process environment.
- Frontend production build on macOS requires the Rollup native binary currently excluded by `pnpm-workspace.yaml` overrides.

## Required environment variables

- `GEMINI_API_KEY` is required for planning, evidence, claims, synthesis, and `POST /api/research`.
- `SEARCH_API_KEY` is required for live search and `POST /api/research`.
- `REQUEST_BODY_LIMIT` defaults to `256kb` so evidence payloads can be accepted.

## Next phase

Phase 11 — Frontend Foundation
