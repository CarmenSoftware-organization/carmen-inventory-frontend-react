import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { LucideIcon } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SideMain } from "./side-main";

// t(key) → key (namespace ไม่สำคัญสำหรับเทสต์นี้)
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// jsdom ไม่มี window.matchMedia — SidebarProvider ใช้ useIsMobile() (hooks/use-mobile.ts)
// ซึ่งเรียก matchMedia ตอน mount เสมอ ไม่ว่าจะทดสอบอะไรก็ตาม
beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
});

// vi.hoisted เพราะ vi.mock ถูก hoist ไปบนสุดของไฟล์ — ตัวแปรที่ mock factory
// อ้างถึงต้องมาจากที่นี่ ไม่ใช่ const ธรรมดาข้างล่าง (จะเจอ TDZ error)
const { DummyIcon } = vi.hoisted(() => ({
  DummyIcon: (() => null) as unknown as LucideIcon,
}));

// SideMain ใช้ `moduleList` แค่หา activeModule จาก pathname — ให้ตัวเดียวพอ
vi.mock("@/constant/module-list", () => ({
  moduleList: [
    {
      name: "procurementModule",
      path: "/procurement",
      icon: DummyIcon,
      subModules: [],
    },
  ],
}));

// Mock ทั้ง hook ที่ระดับนี้ — ตรรกะการคำนวณ denied/locked เทสต์แยกไว้แล้วที่
// hooks/use-visible-modules.test.ts ตรง ๆ กับ annotate/markAll; ที่นี่ทดสอบแค่ว่า
// SideMain render กุญแจ + เรียก dispatchPermissionDenied ด้วย reason ที่ถูกต้องหรือไม่
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

function renderSideMain() {
  return render(
    <MemoryRouter initialEntries={["/procurement"]}>
      <SidebarProvider>
        <SideMain />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SideMain — plain access (neither locked nor denied)", () => {
  it("renders a navigable Link, not a button", () => {
    visibleSubs.mockReturnValue([sub()]);
    renderSideMain();
    const link = screen.getByRole("link", { name: /subA/i });
    expect(link).toHaveAttribute("href", "/procurement/sub-a");
    expect(screen.queryByRole("button", { name: /subA/i })).toBeNull();
  });
});

describe("SideMain — locked (BU has not licensed the feature)", () => {
  it("renders a button (not a Link) with the Lock icon", () => {
    visibleSubs.mockReturnValue([sub({ locked: true })]);
    renderSideMain();
    expect(screen.queryByRole("link", { name: /subA/i })).toBeNull();
    const button = screen.getByRole("button", { name: /subA/i });
    expect(button.querySelector("svg.lucide-lock")).not.toBeNull();
  });

  it('clicking it dispatches permission-denied with reason "license"', async () => {
    visibleSubs.mockReturnValue([sub({ locked: true })]);
    renderSideMain();
    await userEvent.click(screen.getByRole("button", { name: /subA/i }));
    expect(dispatchPermissionDenied).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      "procurement.purchase_request.view",
      undefined,
      "license",
    );
  });
});

describe("SideMain — denied only (RBAC), not locked", () => {
  it("renders a button without the Lock icon", () => {
    visibleSubs.mockReturnValue([sub({ denied: true })]);
    renderSideMain();
    const button = screen.getByRole("button", { name: /subA/i });
    expect(button.querySelector("svg.lucide-lock")).toBeNull();
  });

  it('clicking it dispatches permission-denied with reason "permission"', async () => {
    visibleSubs.mockReturnValue([sub({ denied: true })]);
    renderSideMain();
    await userEvent.click(screen.getByRole("button", { name: /subA/i }));
    expect(dispatchPermissionDenied).toHaveBeenCalledTimes(1);
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      "procurement.purchase_request.view",
      undefined,
      "permission",
    );
  });
});

describe("SideMain — locked wins over denied when both are true", () => {
  it("still shows the Lock icon", () => {
    visibleSubs.mockReturnValue([sub({ denied: true, locked: true })]);
    renderSideMain();
    const button = screen.getByRole("button", { name: /subA/i });
    expect(button.querySelector("svg.lucide-lock")).not.toBeNull();
  });

  it('still dispatches reason "license", not "permission"', async () => {
    visibleSubs.mockReturnValue([sub({ denied: true, locked: true })]);
    renderSideMain();
    await userEvent.click(screen.getByRole("button", { name: /subA/i }));
    expect(dispatchPermissionDenied).toHaveBeenCalledWith(
      "procurement.purchase_request.view",
      undefined,
      "license",
    );
  });
});
