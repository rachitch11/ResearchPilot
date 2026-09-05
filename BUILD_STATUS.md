# ResearchPilot Build Status

## Current phase

**Phase 4 — Web Search**

## Completed phases

- Phase 0 — Project Inspection & Foundation
- Phase 1 — Backend Foundation
- Phase 2 — AI Provider
- Phase 3 — Research Planner

## Current implementation status

- The project has a deployable React + Vite frontend artifact at the root route.
- The existing API service now has centralized runtime configuration, request limits, CORS configuration, structured request logging, typed API error responses, and a final error boundary.
- The health contract is available at `/api/healthz` and `/api/health`.
- Research orchestration, source extraction, evidence, analytics, authentication, and evaluation are intentionally not implemented yet.
- The AI provider abstraction supports a Gemini adapter with a minimal prompt test route.
- `GET /api/ai/status` reports provider/model/configuration status without exposing credentials.
- `POST /api/ai/test` validates a bounded prompt and returns a provider response.
- `POST /api/research/plan` decomposes a validated question into typed sub-questions, search queries, constraints, and assumptions.
- Planner output is requested as JSON and validated against the generated API schema before it is returned.
- `POST /api/search` accepts bounded search intents, queries Brave Search, normalizes result metadata, removes duplicate URLs, and enforces source limits.
- The search provider is isolated behind a provider interface so another search backend can replace Brave without changing the route or future pipeline.

## Files added or modified

- `artifacts/researchpilot/` — new React + Vite app shell
- `artifacts/api-server/src/config.ts` — validated runtime configuration
- `artifacts/api-server/src/models/errors.ts` — typed API error model
- `artifacts/api-server/src/middlewares/errors.ts` — 404 and centralized error handling
- `artifacts/api-server/src/app.ts` — request limits, CORS, and error middleware wiring
- `artifacts/api-server/src/lib/logger.ts` — service-aware structured logging
- `artifacts/api-server/src/routes/health.ts` — health endpoint and alias
- `artifacts/api-server/src/providers/` — provider-neutral AI interface and Gemini adapter
- `artifacts/api-server/src/routes/ai.ts` — provider status and minimal verification routes
- `artifacts/api-server/src/services/research-planner.ts` — prompt construction and strict plan parsing
- `artifacts/api-server/src/routes/research.ts` — research planning endpoint
- `lib/api-spec/openapi.yaml` — AI status/test contracts
- `lib/api-spec/openapi.yaml` — research planning contract

## Tests completed

- API server typecheck
- API server production bundle
- API health route verification at `/api/health` and `/api/healthz`
- Structured 404 response verification
- Request logging verification through the running workflow
- API provider status verification
- Gemini provider response verification using the securely stored secret
- Research planner input validation and live structured-plan verification
- Search request validation, URL normalization, and duplicate-result handling
- API startup and search-provider configuration handling

## Test result

PARTIAL. The Phase 3 planner checks remain passing, and the Phase 4 search layer builds with validation and deduplication coverage. Live Brave Search verification is blocked until `SEARCH_API_KEY` is configured.

## Known issues

- Source extraction, evidence, synthesis, and the rest of the research pipeline are not available until later approved phases.
- Gemini is selected for the first adapter and is configured through the workspace secret `GEMINI_API_KEY`.
- No database is required for the Phase 2 provider verification.
- The backend foundation uses the existing TypeScript/Express service scaffold; provider-specific and research-specific modules remain unimplemented.

## Required environment variables

- `GEMINI_API_KEY` is required for the AI test route. It is stored through the workspace secret manager and is never logged or returned.
- `SEARCH_API_KEY` is required for live `/api/search` requests. It must be stored through the workspace secret manager and is never logged or returned.

## Next phase

Phase 5 — Webpage Extraction