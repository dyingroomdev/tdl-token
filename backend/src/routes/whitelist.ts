import { Router } from "express";
import multer from "multer";
import { PublicKey } from "@solana/web3.js";
import { parseWhitelistCsv } from "../utils/csv";
import { computeMerkleArtifacts } from "../utils/merkle";
import { logger } from "../utils/logger";
import { updateWhitelistRoot } from "../services/presaleService";
import { config } from "../config";

const upload = multer();
export const whitelistRouter = Router();

whitelistRouter.post(
  "/preview",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Missing CSV file" });
    }
    const pubkeys = parseWhitelistCsv(req.file.buffer);
    const { root, proofs } = computeMerkleArtifacts(pubkeys);
    res.json({ count: pubkeys.length, root, sampleProof: proofs[pubkeys[0]?.toBase58() ?? ""] ?? [] });
  }
);

whitelistRouter.post(
  "/apply",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Missing CSV file" });
    }
    const addresses = parseWhitelistCsv(req.file.buffer);
    await updateWhitelistRoot(addresses, config.presaleAuthority);
    logger.info({ count: addresses.length }, "Whitelist root updated");
    res.status(204).send();
  }
);
