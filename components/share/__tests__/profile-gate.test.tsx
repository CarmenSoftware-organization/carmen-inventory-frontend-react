import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileGate } from "../profile-gate";

/**
 * เคสที่ test นี้มีไว้กัน: โปรไฟล์โหลดผ่าน (200) แต่ `business_unit` ว่าง —
 * คนที่เพิ่งสมัครแล้วยังไม่มีใคร assign เข้าโรงแรมไหน ถ้า gate ปล่อยผ่าน
 * ทุกหน้าจะขึ้น skeleton ค้างถาวร เพราะ query ทั้งแอป `enabled: !!buCode`
 * จึงไม่เคยยิงสักครั้ง — ค้างเงียบ ไม่มี error ให้ใครเห็น
 */

const profile = vi.fn();
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => profile(),
}));

const mutate = vi.fn();
vi.mock("@/hooks/use-logout", () => ({
  useLogout: () => ({ mutate, isPending: false }),
}));

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const baseProfile = {
  isPending: false,
  isError: false,
  refetch: vi.fn(),
  fullName: "Somchai Jaidee",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfileGate", () => {
  it("renders children once the profile carries a business unit", () => {
    profile.mockReturnValue({
      ...baseProfile,
      data: { business_unit: [{ code: "T02" }] },
    });

    render(
      <ProfileGate>
        <p>workspace</p>
      </ProfileGate>,
    );

    expect(screen.getByText("workspace")).toBeInTheDocument();
  });

  it("does not hand a BU-less profile through to the app", () => {
    profile.mockReturnValue({ ...baseProfile, data: { business_unit: [] } });

    render(
      <ProfileGate>
        <p>workspace</p>
      </ProfileGate>,
    );

    expect(screen.queryByText("workspace")).not.toBeInTheDocument();
    expect(screen.getByText("noBuTitle")).toBeInTheDocument();
  });

  it("offers a way out — check again, or sign out of the wrong account", () => {
    profile.mockReturnValue({ ...baseProfile, data: { business_unit: [] } });

    render(
      <ProfileGate>
        <p>workspace</p>
      </ProfileGate>,
    );

    expect(
      screen.getByRole("button", { name: "noBuRetry" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "signOut" })).toBeInTheDocument();
  });

  it("still shows the loader while the profile is in flight", () => {
    profile.mockReturnValue({
      ...baseProfile,
      isPending: true,
      data: undefined,
    });

    render(
      <ProfileGate>
        <p>workspace</p>
      </ProfileGate>,
    );

    expect(screen.queryByText("workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});
