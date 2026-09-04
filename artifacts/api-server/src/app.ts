import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./middlewares/errors";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.disable("x-powered-by");
app.use(
  cors(
    config.corsOrigin === "*"
      ? undefined
      : {
          origin: config.corsOrigin
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
        },
  ),
);
app.use(express.json({ limit: config.requestBodyLimit }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
