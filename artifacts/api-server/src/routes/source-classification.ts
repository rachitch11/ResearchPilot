import { Router, type IRouter } from "express";
import {
  ClassifySourcesBody,
  ClassifySourcesResponse,
} from "@workspace/api-zod";
import { HttpError } from "../models/errors";
import {
  SourceClassifierError,
  classifySources,
} from "../services/source-classifier";

const router: IRouter = Router();

router.post("/sources/classify", async (req, res): Promise<void> => {
  const parsed = ClassifySourcesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    res.json(
      ClassifySourcesResponse.parse({
        sources: classifySources(parsed.data.sources),
      }),
    );
  } catch (error) {
    if (error instanceof SourceClassifierError) {
      throw new HttpError(400, error.message);
    }
    throw error;
  }
});

export default router;