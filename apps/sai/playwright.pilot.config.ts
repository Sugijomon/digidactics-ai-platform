import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";

loadEnvFile(".env.pilot.local");
if (process.env.SAI_PILOT_TARGET !== "staging" ||
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://invalid").hostname !== "gpptjkwxqxxdsjgwzhzl.supabase.co" ||
  !process.env.SAI_PILOT_PASSWORD) {
  throw new Error("Explicit verified staging configuration is required for pilot tests.");
}

export default defineConfig({
  testDir: "./tests/pilot",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"], channel: "msedge",
    baseURL: "http://127.0.0.1:3105",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: "off", // Do not persist login credentials or respondent tokens.
    screenshot: "off",
  },
  webServer: {
    command: "corepack pnpm dev --hostname 127.0.0.1 --port 3105",
    url: "http://127.0.0.1:3105",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_SAI_DEFAULT_WAVE_TOKEN: "",
      SAI_ENABLE_DEV_ROUTES: "true",
    },
  },
});
