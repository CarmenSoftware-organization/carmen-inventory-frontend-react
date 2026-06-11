import { expect, test } from "@playwright/test";

/**
 * Authenticated config smoke — ต้องตั้ง E2E_EMAIL / E2E_PASSWORD
 * (และ backend ที่ E2E_BACKEND, default http://localhost:4000)
 * Backend จำกัด login (429/180s ต่อ email) — spec นี้ login ครั้งเดียวต่อการรัน
 */
test("login and browse config modules", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").first().fill(process.env.E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  // Dialog-based module list renders
  await page.goto("/config/unit");
  await expect(page.getByRole("table").first()).toBeVisible({ timeout: 10_000 });
  expect(await page.getByRole("row").count()).toBeGreaterThan(1); // header + ≥1 data row

  // Page-based module list + new form
  await page.goto("/config/department");
  await expect(page.getByRole("table").first()).toBeVisible({
    timeout: 10_000,
  });
  expect(await page.getByRole("row").count()).toBeGreaterThan(1); // header + ≥1 data row
  await page.goto("/config/department/new");
  // department/new renders DepartmentForm which contains a real <form> element
  // nested inside Reveal animation wrappers — wait for the form element itself.
  // The form has id="department-form" which is stable.
  // Adjustment: use #department-form selector (id-based) to avoid relying on
  // role/visibility timing of the animated wrapper.
  await expect(page.locator("#department-form")).toBeVisible({
    timeout: 10_000,
  });

  // Landing renders module cards (ไม่ใช่ 404)
  await page.goto("/config");
  await expect(page.getByText(/404|not found/i)).toHaveCount(0);
});
