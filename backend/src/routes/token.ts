import { Router } from "express";

// TODO: Wire to tokenService once implemented
export const tokenRouter = Router();

tokenRouter.post("/todo", (_req, res) => {
  res.status(501).json({ error: "NotImplemented", message: "Token administration endpoints coming soon." });
});
