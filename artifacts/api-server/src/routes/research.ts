import { Router, type IRouter } from "express";
import { CreateResearchPlanBody, CreateResearchPlanResponse } from "@workspace/api-zod";
import { HttpError } from "../models/errors";
import { AiProviderError } from "../providers";
import { ResearchPlannerError, createResearchPlan } from "../services/research-planner";

const router: IRouter = Router();

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
    if (error instanceof AiProviderError) {
      req.log.error(
        {
          provider: "configured-ai-provider",
          code: error.code,
          message: error.message,
        },
        "Research planner provider request failed",
      );

      if (error.code === "not_configured") {
        throw new HttpError(503, "The AI provider is not configured.");
      }

      throw new HttpError(502, "The research planner provider request failed.");
    }

    if (error instanceof ResearchPlannerError) {
      req.log.warn({ message: error.message }, "Research planner output invalid");
      throw new HttpError(502, "The research planner returned an invalid plan.");
    }

    throw error;
  }
});

export default router;