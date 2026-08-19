import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { LucideIcon } from "lucide-react";
import { ModuleLanding } from "./module-landing";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const DummyIcon = (() => null) as unknown as LucideIcon;

vi.mock("@/constant/module-list", () => ({
  getModule: () => ({
    name: "procurementModule",
    path: "/procurement",
    icon: DummyIcon,
    subModules: [],
  }),
}));

// ตรรกะ denied/locked เทสต์แยกไว้แล้วที่ hooks/use-visible-modules.test.ts —
// ที่นี่ mock ทั้ง hook เพื่อทดสอบแค่ว่า ModuleLanding render กุญแจ + เรียก
// dispatchPermissionDenied ด้วย reason ที่ถูกต้อง (ตามแบบ side-main.test.tsx)
const visibleSubs = vi.fn();
vi.mock("@/hooks/use-visible-modules", () => ({
  useVisibleModules: () => visibleSubs(),
}));

const dispatchPermissionDenied = vi.fn();
vi.mock("@/components/permission-denied-dialog", () => ({
  dispatchPermissionDenied: (...args: unknown[]) =>
    dispatchPermissionDenied(...args),
}));

function sub(overrides: Record<string, unknown> = {}) {
  return {
    name: "subA",
    path: "/procurement/sub-a",
    icon: DummyIcon,
    denied: false,
    locked: false,
    permission: "procurement.purchase_request.view",
    ...overrides,
  };
}

function renderLanding() {
  return render(
    <MemoryRouter>
      <ModuleLanding modulePath="/procurement" description="desc" />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ModuleLanding — plain access (neither locked nor denied)", () => {
  it("renders a navigable Link, not a button", () => {
    visibleSubs.mockReturnValue([sub()]);
    renderLanding();
    const link = screen.getByRole("link", { name: /subA/i });
    expect(link).toHaveAttribute("href", "/procurement/sub-a");
  });
});

describe("ModuleLanding — locked (BU has not licensed the feature)", () => {
  it("renders a button (not a Link) with the Lock icon, dimmed", () => {
    visibleSubs.mockReturnValue([sub({ locked: true })]);
    renderLanding();
    expect(screen.queryByRole("link", { name: /subA/i })).toBeNull();
    const button = screen.getByRole("button", { name: /subA/i });
    expect(button.querySelector("svg.lucide-lock")).not.toBeNull();
    expect(button.className).toMatch(/opacity-50/);
  });

  it('clicking it dispatches permission-denied with reason "license"', async () => {
    visibleSubs.mockReturnValue([sub({ locked: true })]);
    renderLanding();
    await userEvent.click(screen.getByRole("button", { name: /subA/i }));
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      "procurement.purchase_request.view",
      undefined,
      "license",
    );
  });
});

describe("ModuleLanding — denied only (RBAC), not locked", () => {
  it("renders a button without the Lock icon", () => {
    visibleSubs.mockReturnValue([sub({ denied: true })]);
    renderLanding();
    const button = screen.getByRole("button", { name: /subA/i });
    expect(button.querySelector("svg.lucide-lock")).toBeNull();
  });

  it('clicking it dispatches permission-denied with reason "permission"', async () => {
    visibleSubs.mockReturnValue([sub({ denied: true })]);
    renderLanding();
    await userEvent.click(screen.getByRole("button", { name: /subA/i }));
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      "procurement.purchase_request.view",
      undefined,
      "permission",
    );
  });
});

describe("ModuleLanding — locked wins over denied when both are true", () => {
  it("still shows the Lock icon and reason license", async () => {
    visibleSubs.mockReturnValue([sub({ denied: true, locked: true })]);
    renderLanding();
    const button = screen.getByRole("button", { name: /subA/i });
    expect(button.querySelector("svg.lucide-lock")).not.toBeNull();
    await userEvent.click(button);
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      "procurement.purchase_request.view",
      undefined,
      "license",
    );
  });
});
