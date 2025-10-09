import { Router } from "express";
import { fetchPresaleStatus } from "../services/presaleService";
import { logger } from "../utils/logger";

export const statusRouter = Router();

statusRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

statusRouter.get("/presale", async (_req, res) => {
  const data = await fetchPresaleStatus();
  res.json(data);
});
