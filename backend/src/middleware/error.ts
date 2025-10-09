import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", details: err.errors });
  }

  logger.error({ err }, "Unhandled error");
  return res.status(500).json({ error: "InternalServerError" });
}
