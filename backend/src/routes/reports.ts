import { Router } from "express";
import { generatePresaleSummary, toCsv } from "../services/reportService";

export const reportsRouter = Router();

reportsRouter.get("/summary", async (_req, res) => {
  const summary = await generatePresaleSummary();
  res.json(summary);
});

reportsRouter.get("/summary.csv", async (_req, res) => {
  const summary = await generatePresaleSummary();
  const csv = toCsv(summary);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=presale-summary.csv");
  res.send(csv);
});
