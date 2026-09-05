import { Router, type IRouter } from "express";
import {
  SearchWebBody,
  SearchWebResponse,
} from "@workspace/api-zod";
import { HttpError } from "../models/errors";
import { SearchProviderError } from "../providers";
import { SearchServiceError, searchWeb } from "../services/search-service";

const router: IRouter = Router();

router.post("/search", async (req, res): Promise<void> => {
  const parsed = SearchWebBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await searchWeb(parsed.data.queries, parsed.data.maxResults);
    res.json(SearchWebResponse.parse(result));
  } catch (error) {
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

    if (error instanceof SearchServiceError) {
      throw new HttpError(400, error.message);
    }

    throw error;
  }
});

export default router;