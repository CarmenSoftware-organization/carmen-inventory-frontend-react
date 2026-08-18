import { describe, it, expect } from "vitest";
import { featureKeyOf, resolveLicense } from "./use-license";
import type { BusinessUnitLicense } from "@/types/profile";

const makeLicense = (
  overrides: Partial<BusinessUnitLicense> = {},
): BusinessUnitLicense => ({
  state: "active",
  end_date: "2027-01-01T00:00:00.000Z",
  features: ["procurement", "procurement.purchase_request"],
  seat: { used: 7, cap: 10, pending_invites: 2 },
  ...overrides,
});

describe("featureKeyOf", () => {
  it("strips the trailing action off a multi-level permission key", () => {
    expect(featureKeyOf("procurement.purchase_request.view")).toBe(
      "procurement.purchase_request",
    );
    expect(featureKeyOf("procurement.purchase_request.create")).toBe(
      "procurement.purchase_request",
    );
  });

  it("returns the key unchanged when there is no dot at all", () => {
    expect(featureKeyOf("dashboard")).toBe("dashboard");
  });
});

describe("resolveLicense — enforcement switch off (shadow mode)", () => {
  it("isLicensed returns true even when features is empty", () => {
    const license = makeLicense({ state: "none", features: [] });
    const info = resolveLicense(license, false);
    expect(info.isLicensed("procurement.purchase_request")).toBe(true);
    expect(info.isLicensed("anything.at_all")).toBe(true);
  });

  it("canWrite is true even when state is expired", () => {
    const license = makeLicense({ state: "expired" });
    const info = resolveLicense(license, false);
    expect(info.canWrite).toBe(true);
  });

  it("still reports enforced=false and the raw state for debugging", () => {
    const license = makeLicense({ state: "expired" });
    const info = resolveLicense(license, false);
    expect(info.enforced).toBe(false);
    expect(info.state).toBe("expired");
  });
});

describe("resolveLicense — enforcement switch on", () => {
  it('state "none" locks every feature', () => {
    const license = makeLicense({ state: "none", end_date: null, features: [] });
    const info = resolveLicense(license, true);
    expect(info.isLicensed("procurement")).toBe(false);
    expect(info.isLicensed("procurement.purchase_request")).toBe(false);
    expect(info.canWrite).toBe(false);
  });

  it('state "unresolved" does not lock and remains writable, like the backend bypass', () => {
    const license = makeLicense({
      state: "unresolved",
      end_date: null,
      features: [],
    });
    const info = resolveLicense(license, true);
    expect(info.isLicensed("procurement")).toBe(true);
    expect(info.isLicensed("anything.at_all")).toBe(true);
    expect(info.canWrite).toBe(true);
  });

  it("expired/inactive: canWrite is false but isLicensed still follows features[]", () => {
    const expired = resolveLicense(
      makeLicense({ state: "expired" }),
      true,
    );
    expect(expired.canWrite).toBe(false);
    expect(expired.isLicensed("procurement.purchase_request")).toBe(true);
    expect(expired.isLicensed("vendor_management")).toBe(false);

    const inactive = resolveLicense(
      makeLicense({ state: "inactive" }),
      true,
    );
    expect(inactive.canWrite).toBe(false);
    expect(inactive.isLicensed("procurement.purchase_request")).toBe(true);
  });

  it("active with the feature listed is licensed and writable", () => {
    const info = resolveLicense(makeLicense({ state: "active" }), true);
    expect(info.isLicensed("procurement.purchase_request")).toBe(true);
    expect(info.canWrite).toBe(true);
  });
});

describe("resolveLicense — license block missing entirely", () => {
  it("is unlimited when the switch is on", () => {
    const info = resolveLicense(undefined, true);
    expect(info.hasLicenseData).toBe(false);
    expect(info.isLicensed("anything.at_all")).toBe(true);
    expect(info.canWrite).toBe(true);
  });

  it("is unlimited when the switch is off", () => {
    const info = resolveLicense(undefined, false);
    expect(info.hasLicenseData).toBe(false);
    expect(info.isLicensed("anything.at_all")).toBe(true);
    expect(info.canWrite).toBe(true);
  });

  it("reports seat as undefined and state defaulted to active", () => {
    const info = resolveLicense(undefined, true);
    expect(info.seat).toBeUndefined();
    expect(info.state).toBe("active");
    expect(info.endDate).toBeNull();
  });
});
