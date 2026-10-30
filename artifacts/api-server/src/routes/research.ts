import { Router, type IRouter, type Request } from "express";
import {
  AnalyzeClaimsBody,
  AnalyzeClaimsResponse,
  CreateResearchPlanBody,
  CreateResearchPlanResponse,
  ExtractEvidenceBody,
  ExtractEvidenceResponse,
  GetResearchParams,
  RunResearchBody,
  RunResearchResponse,
  SynthesizeResearchBody,
  SynthesizeResearchResponse,
} from "@workspace/api-zod";
import { HttpError } from "../models/errors";
import {
  AiProviderError,
  SearchProviderError,
  getAiProviderStatus,
  getSearchProviderStatus,
} from "../providers";
import { ClaimAnalyzerError, analyzeClaims } from "../services/claim-analyzer";
import {
  EvidenceExtractorError,
  extractEvidence,
} from "../services/evidence-extractor";
import { ResearchPlannerError, createResearchPlan } from "../services/research-planner";
import { runResearch } from "../services/research-orchestrator";
import { getResearchRun } from "../services/research-store";
import { SynthesizerError, synthesizeResearch } from "../services/synthesizer";

const router: IRouter = Router();

function handleProviderError(error: unknown, req: Request, label: string): never {
  if (error instanceof AiProviderError) {
    req.log.error(
      {
        provider: "configured-ai-provider",
        code: error.code,
        message: error.message,
      },
      `${label} provider request failed`,
    );
    if (error.code === "not_configured") {
      throw new HttpError(503, "The AI provider is not configured.");
    }
    throw new HttpError(502, `${label} provider request failed.`);
  }

  if (error instanceof SearchProviderError) {
    req.log.error(
      {
        provider: "configured-search-provider",
        code: error.code,
        message: error.message,
      },
      "Search provider request failed",
    );
    if (error.code === "not_configured") {
      throw new HttpError(503, "The search provider is not configured.");
    }
    throw new HttpError(502, "The search provider request failed.");
  }

  throw error instanceof Error ? error : new Error(String(error));
}

router.post("/research/plan", async (req, res): Promise<void> => {
  const parsed = CreateResearchPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const plan = await createResearchPlan(parsed.data.question);
    res.json(CreateResearchPlanResponse.parse(plan));
  } catch (error) {
    if (error instanceof ResearchPlannerError) {
      req.log.warn({ message: error.message }, "Research planner output invalid");
      throw new HttpError(502, "The research planner returned an invalid plan.");
    }
    handleProviderError(error, req, "The research planner");
  }
});

router.post("/research/evidence", async (req, res): Promise<void> => {
  const parsed = ExtractEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    res.json(ExtractEvidenceResponse.parse(await extractEvidence(parsed.data)));
  } catch (error) {
    if (error instanceof EvidenceExtractorError) {
      throw new HttpError(502, "The evidence extractor returned an invalid result.");
    }
    handleProviderError(error, req, "The evidence extractor");
  }
});

router.post("/research/claims", async (req, res): Promise<void> => {
  const parsed = AnalyzeClaimsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    res.json(AnalyzeClaimsResponse.parse(await analyzeClaims(parsed.data)));
  } catch (error) {
    if (error instanceof ClaimAnalyzerError) {
      throw new HttpError(502, "The claim analyzer returned an invalid result.");
    }
    handleProviderError(error, req, "The claim analyzer");
  }
});

router.post("/research/synthesize", async (req, res): Promise<void> => {
  const parsed = SynthesizeResearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    res.json(SynthesizeResearchResponse.parse(await synthesizeResearch(parsed.data)));
  } catch (error) {
    if (error instanceof SynthesizerError) {
      throw new HttpError(502, "The synthesizer returned an invalid result.");
    }
    handleProviderError(error, req, "The synthesizer");
  }
});

router.post("/research", async (req, res): Promise<void> => {
  const parsed = RunResearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!getAiProviderStatus().configured) {
    throw new HttpError(503, "The AI provider is not configured.");
  }
  if (!getSearchProviderStatus().configured) {
    throw new HttpError(503, "The search provider is not configured.");
  }

  try {
    res.json(RunResearchResponse.parse(await runResearch(parsed.data.question)));
  } catch (error) {
    handleProviderError(error, req, "The research pipeline");
  }
});

router.get("/research/:researchId", (req, res): void => {
  const parsed = GetResearchParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const run = getResearchRun(parsed.data.researchId);
  if (!run) {
    throw new HttpError(404, "Research run not found.");
  }
  res.json(RunResearchResponse.parse(run));
});

export default router;
