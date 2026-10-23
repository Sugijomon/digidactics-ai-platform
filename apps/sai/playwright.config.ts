import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.SAI_E2E_PORT ?? "3100";
const baseURL = process.env.SAI_E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const reuseExistingServer = process.env.SAI_E2E_REUSE_SERVER === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `corepack pnpm dev --hostname 127.0.0.1 --port ${PORT}`,
    reuseExistingServer,
    timeout: 120_000,
    url: baseURL,
  },
});
