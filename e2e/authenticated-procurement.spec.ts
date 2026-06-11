import { expect, test } from "@playwright/test";

/**
 * Authenticated procurement smoke — ต้องตั้ง E2E_EMAIL / E2E_PASSWORD
 * Login ครั้งเดียวต่อการรัน (backend rate-limit 429/180s ต่อ email)
 */
test("login and browse procurement modules", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").first().fill(process.env.E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  // Lists render (table header ปรากฏเสมอแม้ไม่มี data rows)
  for (const path of [
    "/procurement/purchase-request-template",
    "/procurement/credit-note",
    "/procurement/goods-receive-note",
    "/procurement/purchase-order",
    "/procurement/purchase-request",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("table").first()).toBeVisible({ timeout: 10_000 });
  }

  // Detail: คลิกปุ่มใน tbody ของ PR list (cell ใช้ <button>) → :id โหลดเอกสารจริง
  await page.goto("/procurement/purchase-request");
  await expect(page.getByRole("table").first()).toBeVisible({ timeout: 10_000 });
  const firstCellButton = page.locator("table tbody button").first();
  if (await firstCellButton.count()) {
    await firstCellButton.click();
    await expect(page).toHaveURL(/purchase-request\/[\w-]+/, { timeout: 10_000 });
  }

  // Landing + approval ไม่ใช่ 404
  for (const path of ["/procurement", "/procurement/approval"]) {
    await page.goto(path);
    await expect(page.getByText(/404|not found/i)).toHaveCount(0);
  }
});
