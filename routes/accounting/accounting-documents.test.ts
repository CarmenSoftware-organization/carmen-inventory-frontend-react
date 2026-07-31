import { describe, expect, it } from "vitest";
import { getModule } from "@/constant/module-list";
import {
  accountingDetailInitialMode,
  accountingDocumentFromPath,
} from "./accounting-documents";

describe("accounting navigation", () => {
  it("maps nested list and detail paths to the same document type", () => {
    expect(
      accountingDocumentFromPath("/accounting/accounts-payable/invoice/ap-1")
        .kind,
    ).toBe("apInvoice");
  });

  it("opens the dashboard from the module root without a dashboard submenu", () => {
    const accounting = getModule("/accounting");
    expect(
      accounting.subModules?.some(
        (item) => item.name === "accountingDashboard",
      ),
    ).toBe(false);
    expect(
      accounting.subModules?.find((item) => item.name === "accountsPayable")
        ?.subModules,
    ).toHaveLength(2);
  });

  it("keeps existing documents read-only until edit and opens new documents in add mode", () => {
    expect(accountingDetailInitialMode("jv-1")).toBe("view");
    expect(accountingDetailInitialMode("new")).toBe("add");
  });
});
