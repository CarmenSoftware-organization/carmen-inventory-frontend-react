import { expect, test } from "@playwright/test";

/**
 * Authenticated shell smoke — final-phase sections (dashboard/report/profile/notifications).
 * ต้องตั้ง E2E_EMAIL / E2E_PASSWORD (และ backend ที่ E2E_BACKEND, default http://localhost:4000)
 * Backend จำกัด login (429/180s ต่อ email) — spec นี้ login ครั้งเดียวต่อการรัน
 */
test("login and browse shell sections (dashboard/report/profile/notifications)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox").first().fill(process.env.E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  // REAL dashboard — placeholder must be gone, real UI (heading) renders
  await page.goto("/dashboard");
  await expect(page.getByText(/lands in a later phase/i)).toHaveCount(0);
  await expect(page.getByRole("heading").first()).toBeVisible({
    timeout: 10_000,
  });

  // Report list — DataGridTable renders (role table)
  await page.goto("/report/list");
  await expect(page.getByText(/404|not found/i)).toHaveCount(0);
  await expect(page.getByRole("table").first()).toBeVisible({
    timeout: 10_000,
  });

  // Profile renders (not 404; profile heading/tabs render)
  await page.goto("/profile");
  await expect(page.getByText(/404|not found/i)).toHaveCount(0);
  await expect(page.getByRole("heading").first()).toBeVisible({
    timeout: 10_000,
  });

  // Notifications renders (not 404; "notifications" header)
  await page.goto("/notifications");
  await expect(page.getByText(/404|not found/i)).toHaveCount(0);
  await expect(page.getByRole("heading").first()).toBeVisible({
    timeout: 10_000,
  });
});
