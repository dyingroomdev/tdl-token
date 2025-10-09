import express from "express";
import helmet from "helmet";
import cors from "cors";
import "express-async-errors";

import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import { statusRouter } from "./routes/status";
import { whitelistRouter } from "./routes/whitelist";
import { presaleRouter } from "./routes/presale";
import { tokenRouter } from "./routes/token";
import { reportsRouter } from "./routes/reports";
import { operationsRouter } from "./routes/operations";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(authMiddleware);

  app.use("/status", statusRouter);
  app.use("/whitelist", whitelistRouter);
  app.use("/presale", presaleRouter);
  app.use("/token", tokenRouter);
  app.use("/reports", reportsRouter);
  app.use("/operations", operationsRouter);

  app.use(errorHandler);
  return app;
}
