import { Router } from "express";
import { runHardeningScript } from "../services/hardeningService";
import { config } from "../config";

const router = Router();

router.post("/hardening", async (_req, res) => {
  const { stdout, stderr } = await runHardeningScript(config.tdlMint.toBase58());
  res.json({ stdout, stderr });
});

export const operationsRouter = router;
