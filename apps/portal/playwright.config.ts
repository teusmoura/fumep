import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.MIG6_E2E_BASE_URL || "http://localhost:3002";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
  throw new Error("MIG 6 E2E runs only against a local Nuxt instance");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    baseURL,
    trace: "retain-on-failure",
  },
  reporter: "list",
});
