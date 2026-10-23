import { loadEnvFile } from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

loadEnvFile(".env.pilot.local");
if (process.env.SAI_PILOT_TARGET !== "staging" ||
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://invalid").hostname !== "gpptjkwxqxxdsjgwzhzl.supabase.co") {
  throw new Error("Pilot start refused: the verified staging environment is required.");
}
const next = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
const child = spawn(process.execPath, [next, "dev", "--hostname", "127.0.0.1", "--port", "3105"], {
  stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN: "", SAI_ENABLE_DEV_ROUTES: "true" },
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
