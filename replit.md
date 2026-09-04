# ResearchPilot

ResearchPilot is an AI-powered research workspace that will find, verify, and explain evidence behind complex questions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/researchpilot run dev` — run the ResearchPilot frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `cat BUILD_STATUS.md` — inspect the current phased build checkpoint

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (foundation service; research-specific routes are added in later phases)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/researchpilot/` — React + Vite frontend and product UI
- `artifacts/api-server/` — shared API server and routes
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react/` — generated React Query client
- `lib/api-zod/` — generated server validation schemas
- `BUILD_STATUS.md` — phase checkpoint and continuation state

## Architecture decisions

- The project is built one phase at a time so each checkpoint remains runnable and recoverable.
- OpenAPI remains the source of truth for shared API contracts.
- Phase 0 intentionally uses no database or external provider.

## Product

The finished product will turn complex questions into structured, source-backed research reports with visible high-level progress, citations, uncertainty, and private aggregate analytics.

## User preferences

The user asked for controlled one-phase-at-a-time delivery with a status report and an explicit stop after each phase.

## Gotchas

- Keep `.env` and provider credentials out of Git; use `.env.example` for safe configuration documentation.
- Run API code generation after every OpenAPI change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
