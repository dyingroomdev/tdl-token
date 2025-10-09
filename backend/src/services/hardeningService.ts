import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function runHardeningScript(mint: string) {
  const scriptPath = path.join(process.cwd(), "scripts", "hardening.ts");
  const tsNodePath = require.resolve("ts-node/register");

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["-r", tsNodePath, scriptPath, "--mint", mint],
    {
      env: process.env,
    }
  );

  return { stdout, stderr };
}
