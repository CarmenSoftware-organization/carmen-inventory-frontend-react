import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LicenseExpiredBanner } from "./license-expired-banner";

// t(key, values) → key แล้วแนบ values ต่อท้ายเพื่อยืนยัน interpolation (date)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const license = vi.fn();
vi.mock("@/hooks/use-license", () => ({
  useLicense: () => license(),
}));

function setup(overrides: {
  enforced: boolean;
  state: "active" | "expired" | "inactive" | "none" | "unresolved";
  endDate?: string | null;
}) {
  license.mockReturnValue({
    enforced: overrides.enforced,
    state: overrides.state,
    endDate: overrides.endDate ?? null,
  });
}

describe("LicenseExpiredBanner — enforced gate (correction #1)", () => {
  it("renders nothing when enforcement is off, even with state expired", () => {
    setup({ enforced: false, state: "expired", endDate: "2020-01-01T00:00:00.000Z" });
    render(<LicenseExpiredBanner />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders nothing when enforcement is off, even with state inactive", () => {
    setup({ enforced: false, state: "inactive" });
    render(<LicenseExpiredBanner />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("LicenseExpiredBanner — allowlist, not blocklist (correction #2)", () => {
  it('renders nothing for state "unresolved" even with enforcement on — a DB hiccup is not an expired contract', () => {
    setup({ enforced: true, state: "unresolved" });
    render(<LicenseExpiredBanner />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it('renders nothing for state "none" — every module is already locked elsewhere', () => {
    setup({ enforced: true, state: "none" });
    render(<LicenseExpiredBanner />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it('renders nothing for state "active"', () => {
    setup({ enforced: true, state: "active" });
    render(<LicenseExpiredBanner />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("LicenseExpiredBanner — expired/inactive with enforcement on", () => {
  it("renders the expired copy with the formatted end date", () => {
    setup({ enforced: true, state: "expired", endDate: "2026-03-15T00:00:00.000Z" });
    render(<LicenseExpiredBanner />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("expiredBanner:");
    expect(alert.textContent).toContain("2026");
  });

  it("renders the inactive copy without a date placeholder", () => {
    setup({ enforced: true, state: "inactive" });
    render(<LicenseExpiredBanner />);
    expect(screen.getByText("inactiveBanner")).toBeInTheDocument();
  });

  it("the CalendarX icon carries the only red signal — the wrapper stays neutral (docs/DESIGN.md)", () => {
    setup({ enforced: true, state: "expired", endDate: "2026-03-15T00:00:00.000Z" });
    render(<LicenseExpiredBanner />);
    const alert = screen.getByRole("alert");
    expect(alert.className).not.toMatch(/destructive/);
    const icon = alert.querySelector("svg.lucide-calendar-x");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("text-destructive");
  });
});
