import { Router } from "express";
import { z } from "zod";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { togglePause, withdrawFunds } from "../services/presaleService";

const pauseSchema = z.object({ paused: z.boolean() });
const withdrawSchema = z.object({
  amount: z.string().regex(/^[0-9]+$/, "Amount must be lamports"),
  destination: z.string(),
});

export const presaleRouter = Router();

presaleRouter.post("/pause", async (req, res) => {
  const body = pauseSchema.parse(req.body);
  await togglePause(body.paused, config.presaleAuthority);
  res.status(204).send();
});

presaleRouter.post("/withdraw", async (req, res) => {
  const body = withdrawSchema.parse(req.body);
  await withdrawFunds(new BN(body.amount), config.presaleAuthority, new PublicKey(body.destination));
  res.status(204).send();
});
