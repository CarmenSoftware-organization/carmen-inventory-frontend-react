import { describe, expect, it } from "vitest";
import { router } from "@/routes/router";

describe("protected routes", () => {
  it("renders Accounting inside the protected application shell", () => {
    const appRoot = router.routes[0];
    const protectedShell = appRoot.children?.find((route) =>
      route.children?.some((child) => child.path === "dashboard"),
    );

    expect(
      protectedShell?.children?.some((route) => route.path === "accounting"),
    ).toBe(true);
    expect(appRoot.children?.some((route) => route.path === "accounting")).toBe(
      false,
    );
  });
});
