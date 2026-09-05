import { Router, type IRouter } from "express";
import {
  TestAiProviderResponse,
  TestAiProviderBody,
} from "@workspace/api-zod";
import { HttpError } from "../models/errors";
import {
  AiProviderError,
  getAiProvider,
  getAiProviderStatus,
} from "../providers";

const router: IRouter = Router();

router.get("/ai/status", (_req, res): void => {
  res.json(getAiProviderStatus());
});

router.post("/ai/test", async (req, res): Promise<void> => {
  const parsed = TestAiProviderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let provider;
  try {
    provider = getAiProvider();
  } catch (error) {
    if (error instanceof AiProviderError) {
      const statusCode = error.code === "not_configured" ? 503 : 500;
      throw new HttpError(statusCode, error.message);
    }
    throw error;
  }

  try {
    const result = await provider.generateText({
      prompt: parsed.data.prompt,
    });
    res.json(TestAiProviderResponse.parse(result));
  } catch (error) {
    if (error instanceof AiProviderError) {
      req.log.error(
        {
          provider: provider.name,
          code: error.code,
          message: error.message,
        },
        "AI provider request failed",
      );

      if (error.code === "not_configured") {
        throw new HttpError(503, error.message);
      }

      throw new HttpError(502, "The AI provider request failed.");
    }
    throw error;
  }
});

export default router;