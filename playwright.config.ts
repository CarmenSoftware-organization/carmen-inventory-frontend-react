import { defineConfig, Project } from "@playwright/test";

// Authenticated project รันเมื่อตั้ง E2E_EMAIL/E2E_PASSWORD เท่านั้น
// (CI ที่ไม่มี credentials ข้ามไปโดย suite ยังเขียวเหมือนเดิม)
const hasCreds = !!process.env.E2E_EMAIL && !!process.env.E2E_PASSWORD;
const E2E_BACKEND = process.env.E2E_BACKEND ?? "http://localhost:4000";

const authenticatedProjects: Project[] = hasCreds
  ? [
      {
        name: "authenticated",
        testMatch: /authenticated/,
        use: { baseURL: "http://localhost:3132" },
      },
    ]
  : [];

const authenticatedWebServers = hasCreds
  ? [
      {
        command: `VITE_DEV_PROXY_TARGET=${E2E_BACKEND} bun run dev --port 3132`,
        url: "http://localhost:3132",
        reuseExistingServer: !process.env.CI,
      },
    ]
  : [];

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  projects: [
    {
      name: "static",
      testIgnore: /authenticated/,
      use: { baseURL: "http://localhost:4173" },
    },
    ...authenticatedProjects,
  ],
  webServer: [
    {
      command: "bun run preview --port 4173",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
    },
    ...authenticatedWebServers,
  ],
});
