import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { StatusBadge } from "../status-badge";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("StatusBadge", () => {
  it("renders a green (success) dot + active label when active", () => {
    const { container } = render(<StatusBadge active />);
    expect(container.textContent).toContain("active");
    // สีอยู่ที่ dot อย่างเดียว — มี dot สี success
    expect(container.querySelector(".bg-success")).not.toBeNull();
  });

  it("renders a muted dot (no success color) + inactive label when inactive", () => {
    const { container } = render(<StatusBadge active={false} />);
    expect(container.textContent).toContain("inactive");
    // inactive ต้องไม่มีสีเขียว
    expect(container.querySelector(".bg-success")).toBeNull();
  });

  it("keeps the badge itself neutral (secondary variant, not tinted)", () => {
    const { container } = render(<StatusBadge active />);
    expect(container.querySelector(".bg-secondary")).not.toBeNull();
    // label ไม่ถูกย้อมเขียว
    expect(container.querySelector(".text-success")).toBeNull();
  });

  it("forwards extra className (e.g. layout classes)", () => {
    const { container } = render(<StatusBadge active className="shrink-0" />);
    // shrink-0 อยู่บนตัว Badge (นอกเหนือจาก dot ที่มี shrink-0 อยู่แล้ว)
    expect(
      container.querySelectorAll(".shrink-0").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("applies the xs size when requested", () => {
    const { container } = render(<StatusBadge active size="xs" />);
    expect(container.querySelector('[class*="h-5"]')).not.toBeNull();
  });
});
