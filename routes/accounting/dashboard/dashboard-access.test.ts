import { describe, expect, it } from "vitest";
import { ROLE_ACCESS, resolveDashboardAudience } from "./dashboard-access";

describe("accounting dashboard role access", () => {
  it("gives accountants operational access only", () => {
    expect(ROLE_ACCESS.accountant).toEqual(["operational"]);
    expect(resolveDashboardAudience("accountant", "management")).toBe(
      "operational",
    );
  });

  it("lets controllers switch between both views", () => {
    expect(resolveDashboardAudience("controller", "management")).toBe(
      "management",
    );
    expect(resolveDashboardAudience("controller", "operational")).toBe(
      "operational",
    );
  });

  it("gives executives management access only", () => {
    expect(ROLE_ACCESS.executive).toEqual(["management"]);
    expect(resolveDashboardAudience("executive", "operational")).toBe(
      "management",
    );
  });
});
