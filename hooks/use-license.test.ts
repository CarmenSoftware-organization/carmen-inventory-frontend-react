import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  featureKeyOf,
  licenseFeatureOf,
  resolveLicense,
  useLicense,
} from "./use-license";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import type { ModuleDto } from "@/constant/module-list";
import type { BusinessUnitLicense } from "@/types/profile";

const profile = vi.fn();
vi.mock("@/hooks/use-profile", () => ({ useProfile: () => profile() }));

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
    const license = makeLicense({
      state: "none",
      end_date: null,
      features: [],
    });
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
    const expired = resolveLicense(makeLicense({ state: "expired" }), true);
    expect(expired.canWrite).toBe(false);
    expect(expired.isLicensed("procurement.purchase_request")).toBe(true);
    expect(expired.isLicensed("vendor_management")).toBe(false);

    const inactive = resolveLicense(makeLicense({ state: "inactive" }), true);
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

describe("licenseFeatureOf", () => {
  const base = { name: "x", path: "/x", icon: (() => null) as never };

  it("ใช้ licenseFeature ที่ระบุไว้ก่อนเสมอ แม้จะมี permission", () => {
    const mod: ModuleDto = {
      ...base,
      permission: "product_management.unit.view",
      licenseFeature: "configuration.unit",
    };
    expect(licenseFeatureOf(mod)).toBe("configuration.unit");
  });

  it("ไม่มี licenseFeature → คำนวณจาก permission", () => {
    const mod: ModuleDto = {
      ...base,
      permission: "procurement.purchase_request.view",
    };
    expect(licenseFeatureOf(mod)).toBe("procurement.purchase_request");
  });

  it("ไม่มีทั้งคู่ → undefined (leaf นี้อยู่นอกขอบเขต license ห้ามล็อก)", () => {
    expect(licenseFeatureOf({ ...base })).toBeUndefined();
  });

  it("มี licenseFeature แต่ไม่มี permission ก็ยังใช้ได้ (leaf ที่ไม่ผูก RBAC)", () => {
    const mod: ModuleDto = {
      ...base,
      licenseFeature: "procurement.purchase_request",
    };
    expect(licenseFeatureOf(mod)).toBe("procurement.purchase_request");
  });
});

describe("resolveLicense — ต้องมีทั้ง module และ resource เหมือน backend", () => {
  it("มีแต่ resource ไม่มี module → ไม่ผ่าน (backend ก็บล็อก)", () => {
    const info = resolveLicense(
      makeLicense({ features: ["procurement.purchase_request"] }),
      true,
    );
    expect(info.isLicensed("procurement.purchase_request")).toBe(false);
  });

  it("มีแต่ module ไม่มี resource → ไม่ผ่าน", () => {
    const info = resolveLicense(
      makeLicense({ features: ["procurement"] }),
      true,
    );
    expect(info.isLicensed("procurement.purchase_request")).toBe(false);
  });

  it("มีครบทั้งคู่ → ผ่าน", () => {
    const info = resolveLicense(
      makeLicense({
        features: ["procurement", "procurement.purchase_request"],
      }),
      true,
    );
    expect(info.isLicensed("procurement.purchase_request")).toBe(true);
  });

  it("module key ล้วน ๆ เช็คตัวมันเองครั้งเดียว", () => {
    const info = resolveLicense(
      makeLicense({ features: ["procurement"] }),
      true,
    );
    expect(info.isLicensed("procurement")).toBe(true);
    expect(info.isLicensed("vendor_management")).toBe(false);
  });

  it("ตัด module ที่จุด**แรก** ไม่ใช่จุดสุดท้าย (ตาม license-route-resolver)", () => {
    const info = resolveLicense(
      makeLicense({ features: ["a", "a.b.c"] }),
      true,
    );
    expect(info.isLicensed("a.b.c")).toBe(true);
  });
});

describe("useLicense — สวิตช์ LICENSE_ENFORCEMENT", () => {
  afterEach(() => setRuntimeConfigForTests(null));

  function setup(config: Parameters<typeof setRuntimeConfigForTests>[0]) {
    setRuntimeConfigForTests(config);
    profile.mockReturnValue({
      license: makeLicense({ state: "none", features: [] }),
    });
    return renderHook(() => useLicense()).result;
  }

  it("ไม่มีคีย์ LICENSE_ENFORCEMENT ใน config → enforced เป็น false (ค่าเริ่มต้นที่กันแอปมืดทั้งตัว)", () => {
    const result = setup({ BACKEND_URL: "", X_APP_ID: "app-1" });
    expect(result.current.enforced).toBe(false);
    // และเพราะ enforced=false ทุกอย่างจึงยังใช้ได้ แม้ state จะเป็น "none"
    expect(result.current.isLicensed("anything.at_all")).toBe(true);
    expect(result.current.canWrite).toBe(true);
  });

  it("คีย์เป็น false ชัดเจน → enforced เป็น false", () => {
    const result = setup({
      BACKEND_URL: "",
      X_APP_ID: "app-1",
      LICENSE_ENFORCEMENT: false,
    });
    expect(result.current.enforced).toBe(false);
  });

  it("คีย์เป็น true → enforced เป็น true และเริ่มล็อกจริง", () => {
    const result = setup({
      BACKEND_URL: "",
      X_APP_ID: "app-1",
      LICENSE_ENFORCEMENT: true,
    });
    expect(result.current.enforced).toBe(true);
    expect(result.current.isLicensed("anything.at_all")).toBe(false);
  });

  it("ยังไม่ได้โหลด runtime config เลย → ไม่ throw และได้ enforced=false", () => {
    setRuntimeConfigForTests(null);
    profile.mockReturnValue({
      license: makeLicense({ state: "expired", features: [] }),
    });
    const { result } = renderHook(() => useLicense());
    expect(result.current.enforced).toBe(false);
    expect(result.current.canWrite).toBe(true);
  });
});
