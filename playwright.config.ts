import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? "3100");
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: true,
    env: {
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET: "playwright-local-secret",
      NEXT_PUBLIC_DEV_USER_ID: "playwright-ui-user",
      ALLOW_DEV_USER_HEADER: "true",
      ALLOW_DB_FALLBACK_ON_ERROR: "true",
      FORCE_LOCAL_STORE: "true",
    },
  },
});
