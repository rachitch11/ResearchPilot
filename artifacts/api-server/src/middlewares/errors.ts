import type { ErrorRequestHandler, RequestHandler } from "express";
import { logger } from "../lib/logger";
import { HttpError, type ApiErrorResponse } from "../models/errors";

export const notFoundHandler: RequestHandler = (req, res) => {
  const response: ApiErrorResponse = {
    error: "Route not found",
    requestId: String(req.id),
  };

  res.status(404).json(response);
};

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message =
    error instanceof HttpError
      ? error.message
      : "An unexpected server error occurred.";

  logger.error(
    {
      err: error,
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode,
    },
    "Request failed",
  );

  if (res.headersSent) {
    return;
  }

  const response: ApiErrorResponse = {
    error: message,
    requestId: String(req.id),
  };

  res.status(statusCode).json(response);
};