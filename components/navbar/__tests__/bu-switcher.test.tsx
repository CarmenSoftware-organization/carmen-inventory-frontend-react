import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BuSwitcher from "../bu-switcher";

/**
 * BU switcher เคยรวมเงื่อนไข "ยังโหลดอยู่" กับ "ไม่มี BU สักอัน" ไว้ก้อนเดียว
 * (`isLoading || isSwitching || !currentDept`) คนที่เพิ่งสมัครแล้วยังไม่ถูก
 * assign เข้าโรงแรมไหนจึงเห็น skeleton หมุนบน navbar ค้างถาวร ทั้งที่โปรไฟล์
 * โหลดจบไปแล้วและไม่มีอะไรจะโหลดอีก
 */

const profile = vi.fn();
vi.mock("@/hooks/use-profile", () => ({ useProfile: () => profile() }));
vi.mock("@/hooks/use-switch-bu", () => ({
  useSwitchBu: () => ({ mutate: vi.fn(), isPending: false }),
  SWITCH_BU_MUTATION_KEY: ["switch-bu"],
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: vi.fn(), removeQueries: vi.fn() }),
  useIsMutating: () => 0,
}));
vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("use-intl", () => ({ useTranslations: () => (key: string) => key }));

const BU = {
  id: "bu-1",
  code: "T02",
  name: "Grand Hotel",
  alias_name: "GH",
  avatar_url: null,
  is_default: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

const skeletons = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="skeleton"]').length;

describe("BuSwitcher", () => {
  it("shows the skeleton while the profile is still loading", () => {
    profile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      defaultBu: undefined,
    });

    const { container } = render(<BuSwitcher />);
    expect(skeletons(container)).toBeGreaterThan(0);
  });

  it("renders the current BU once it is there", () => {
    profile.mockReturnValue({
      data: { business_unit: [BU] },
      isLoading: false,
      isError: false,
      defaultBu: BU,
    });

    render(<BuSwitcher />);
    expect(screen.getByText(/Grand Hotel/)).toBeInTheDocument();
  });

  it("stops spinning when the profile loaded with no business unit at all", () => {
    profile.mockReturnValue({
      data: { business_unit: [] },
      isLoading: false,
      isError: false,
      defaultBu: undefined,
    });

    const { container } = render(<BuSwitcher />);
    expect(skeletons(container)).toBe(0);
    expect(container).toBeEmptyDOMElement();
  });
});
