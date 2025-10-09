import "dotenv/config";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  RPC_ENDPOINT: z.string().url(),
  API_KEY: z.string().min(8),
  PRESALE_PROGRAM_ID: z.string(),
  PRESALE_STATE: z.string(),
  TDL_MINT: z.string(),
  PAY_MINT: z.string(),
  PRESALE_AUTHORITY: z.string(),
  TREASURY_TOKEN_ACCOUNT: z.string().optional(),
  TOKEN_PROGRAM_ID: z.string().optional(),
});

const parsed = schema.parse(process.env);

export const config = {
  port: parsed.PORT,
  rpcEndpoint: parsed.RPC_ENDPOINT,
  apiKey: parsed.API_KEY,
  presaleProgramId: new PublicKey(parsed.PRESALE_PROGRAM_ID),
  presaleState: new PublicKey(parsed.PRESALE_STATE),
  tdlMint: new PublicKey(parsed.TDL_MINT),
  payMint: new PublicKey(parsed.PAY_MINT),
  presaleAuthority: new PublicKey(parsed.PRESALE_AUTHORITY),
  treasuryTokenAccount: parsed.TREASURY_TOKEN_ACCOUNT
    ? new PublicKey(parsed.TREASURY_TOKEN_ACCOUNT)
    : null,
  tokenProgramId: parsed.TOKEN_PROGRAM_ID
    ? new PublicKey(parsed.TOKEN_PROGRAM_ID)
    : null,
} as const;
