import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCan } from "./use-can";
import { PERMISSIONS } from "@/constant/permissions";
import { setRuntimeConfigForTests } from "@/lib/runtime-config";
import type { BusinessUnitLicense } from "@/types/profile";

// Mock ที่ระดับ @/hooks/use-profile เดียว (ตามแบบ route-guard.test.tsx /
// use-visible-modules.test.ts) — useCan ประกอบจาก useProfile + useLicense จริง
// ทั้งคู่ เพื่อยืนยันการต่อสายจริง ไม่ใช่แค่ mock useLicense เอง
const profile = vi.fn();
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => profile(),
}));

const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...args: unknown[]) =>
    dispatchPermissionDenied(...args),
}));

const PERMISSION = PERMISSIONS.configuration.department.create;

function license(overrides: Partial<BusinessUnitLicense> = {}): BusinessUnitLicense {
  return {
    state: "active",
    end_date: "2027-01-01T00:00:00.000Z",
    features: ["configuration", "configuration.department"],
    seat: { used: 0, cap: 0, pending_invites: 0 },
    ...overrides,
  };
}

function setup({
  systemLevel = "user",
  permissions = [] as string[],
  buLicense,
  enforced,
}: {
  systemLevel?: string;
  permissions?: string[];
  buLicense?: BusinessUnitLicense;
  enforced: boolean;
}) {
  setRuntimeConfigForTests({
    BACKEND_URL: "",
    X_APP_ID: "app-1",
    LICENSE_ENFORCEMENT: enforced,
  });
  profile.mockReturnValue({
    defaultBu: { system_level: systemLevel, permissions },
    license: buLicense,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCan — can/canAny/canAll must NOT check license", () => {
  it("can() still returns true when the user has the permission, even with an expired license and enforcement on", () => {
    setup({
      permissions: [PERMISSION],
      buLicense: license({ state: "expired" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    expect(result.current.can(PERMISSION)).toBe(true);
  });

  it("canAny()/canAll() are likewise unaffected by an expired license", () => {
    setup({
      permissions: [PERMISSION],
      buLicense: license({ state: "expired" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    expect(result.current.canAny([PERMISSION])).toBe(true);
    expect(result.current.canAll([PERMISSION])).toBe(true);
  });

  it("can() still returns false for a permission the user lacks, license state notwithstanding", () => {
    setup({
      permissions: [],
      buLicense: license({ state: "active" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    expect(result.current.can(PERMISSION)).toBe(false);
  });
});

describe("useCan — canWrite passthrough", () => {
  it("mirrors useLicense().canWrite", () => {
    setup({ buLicense: license({ state: "expired" }), enforced: true });
    const { result } = renderHook(() => useCan());
    expect(result.current.canWrite).toBe(false);
  });

  it("is true when the license is active", () => {
    setup({ buLicense: license({ state: "active" }), enforced: true });
    const { result } = renderHook(() => useCan());
    expect(result.current.canWrite).toBe(true);
  });
});

describe("useCan — guard() checks license BEFORE permission", () => {
  it('license expired + permission granted: callback is NOT called, dialog reason is "expired"', () => {
    setup({
      permissions: [PERMISSION],
      buLicense: license({ state: "expired" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    const callback = vi.fn();
    result.current.guard(PERMISSION, callback)();

    expect(callback).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      PERMISSION,
      undefined,
      "expired",
    );
  });

  it('license expired + permission ALSO missing: still reports "expired", not "permission" — license wins', () => {
    setup({
      permissions: [],
      buLicense: license({ state: "expired" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    const callback = vi.fn();
    result.current.guard(PERMISSION, callback)();

    expect(callback).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      PERMISSION,
      undefined,
      "expired",
    );
  });

  it("REQUIRED: license has no admin bypass — admin is still blocked by guard() when the contract is expired", () => {
    setup({
      systemLevel: "admin",
      permissions: [],
      buLicense: license({ state: "expired" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    const callback = vi.fn();
    result.current.guard(PERMISSION, callback)();

    expect(callback).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      PERMISSION,
      undefined,
      "expired",
    );
  });

  it('license active + permission missing: falls through to the default "permission" reason', () => {
    setup({
      permissions: [],
      buLicense: license({ state: "active" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    const callback = vi.fn();
    result.current.guard(PERMISSION, callback)();

    expect(callback).not.toHaveBeenCalled();
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(PERMISSION);
  });

  it("license active + permission granted: callback runs, nothing is dispatched", () => {
    setup({
      permissions: [PERMISSION],
      buLicense: license({ state: "active" }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    const callback = vi.fn();
    result.current.guard(PERMISSION, callback)("arg1");

    expect(callback).toHaveBeenCalledWith("arg1");
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it("enforcement switch off (shadow mode): guard() still calls the callback even though state is expired", () => {
    setup({
      permissions: [PERMISSION],
      buLicense: license({ state: "expired" }),
      enforced: false,
    });
    const { result } = renderHook(() => useCan());
    const callback = vi.fn();
    result.current.guard(PERMISSION, callback)();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });

  it('state "unresolved" with enforcement on: writes stay allowed, same as the backend bypass', () => {
    setup({
      permissions: [PERMISSION],
      buLicense: license({ state: "unresolved", end_date: null, features: [] }),
      enforced: true,
    });
    const { result } = renderHook(() => useCan());
    expect(result.current.canWrite).toBe(true);
    const callback = vi.fn();
    result.current.guard(PERMISSION, callback)();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).not.toHaveBeenCalled();
  });
});
