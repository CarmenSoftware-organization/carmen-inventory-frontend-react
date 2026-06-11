import { expect, test } from "@playwright/test";

test("unauthenticated visitor is redirected to the login form", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("textbox").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});
