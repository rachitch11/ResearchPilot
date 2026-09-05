import { Router, type IRouter } from "express";
import { ReadWebpageBody, ReadWebpageResponse } from "@workspace/api-zod";
import { HttpError } from "../models/errors";
import { WebpageReaderError, readWebpage } from "../services/webpage-reader";

const router: IRouter = Router();

router.post("/webpage/read", async (req, res): Promise<void> => {
  const parsed = ReadWebpageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    res.json(ReadWebpageResponse.parse(await readWebpage(parsed.data.url)));
  } catch (error) {
    if (error instanceof WebpageReaderError) {
      req.log.warn(
        {
          code: error.code,
          message: error.message,
        },
        "Webpage reader request failed",
      );

      if (error.code === "invalid_url") {
        throw new HttpError(400, error.message);
      }
      if (error.code === "too_large") {
        throw new HttpError(413, error.message);
      }
      if (error.code === "empty_content") {
        throw new HttpError(422, error.message);
      }
      throw new HttpError(502, "The webpage could not be retrieved.");
    }

    throw error;
  }
});

export default router;