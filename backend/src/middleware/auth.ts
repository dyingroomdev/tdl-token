import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/status/health") {
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  if (apiKey !== config.apiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
