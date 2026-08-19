import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import th from "@/messages/th.json";
import { SeatQuotaBanner, SeatQuotaBannerHost } from "./seat-quota-banner";

// mock ของ useLicense() สำหรับเทสต์ SeatQuotaBannerHost เท่านั้น — SeatQuotaBanner (pure)
// ด้านบนไม่เรียก useLicense() เลยจึงไม่ถูกกระทบ (แบบเดียวกับ license-expired-banner.test.tsx)
const license = vi.fn();
vi.mock("@/hooks/use-license", () => ({
  useLicense: () => license(),
}));

// ใช้ IntlProvider จริงกับ th.json จริง (ไม่ mock use-intl) เพื่อยืนยันข้อความจริงที่ผู้ใช้
// เห็น — แบบเดียวกับ components/ui/__tests__/error-state.test.tsx ไม่ใช่แบบ mock-เป็น-key
// ของ license-expired-banner.test.tsx เพราะเทสต์นี้ต้อง assert ตัวเลข "12/5" และวลีไทย
// ("บันทึกข้อมูลไม่ได้", "จะเกินโควตา") ที่ mock คืน key เปล่าให้ไม่ได้
function renderBanner(ui: React.ReactElement) {
  return render(
    <IntlProvider locale="th" messages={th} timeZone="Asia/Bangkok">
      {ui}
    </IntlProvider>,
  );
}

describe("SeatQuotaBanner", () => {
  it("แถบแดงเมื่อเกินโควตา บอกตัวเลขและบอกว่าบันทึกไม่ได้", () => {
    renderBanner(
      <SeatQuotaBanner seat={{ used: 12, cap: 5, pending_invites: 0 }} />,
    );
    expect(screen.getByText(/12\/5/)).toBeInTheDocument();
    expect(screen.getByText(/บันทึกข้อมูลไม่ได้/)).toBeInTheDocument();
  });

  it("ไม่ขึ้นอะไรเลยเมื่อยังไม่เกินและไม่มีใบใกล้หมด", () => {
    const { container } = renderBanner(
      <SeatQuotaBanner seat={{ used: 3, cap: 5, pending_invites: 0 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("แถบเหลืองเฉพาะเมื่อใบที่จะหมดทำให้ pool ต่ำกว่าคนที่ใช้อยู่จริง", () => {
    // ลูกค้าที่ซื้อเผื่อไว้เยอะต้องไม่เห็นแถบที่ไม่มีความหมาย
    renderBanner(
      <SeatQuotaBanner
        seat={{ used: 12, cap: 15, pending_invites: 0 }}
        expiringSoon={{ seats: 10, date: "2026-09-01T00:00:00.000Z" }}
      />,
    );
    expect(screen.getByText(/จะเกินโควตา/)).toBeInTheDocument();
  });

  it("ไม่ขึ้นแถบเหลืองเมื่อหมดแล้วยังพอ", () => {
    const { container } = renderBanner(
      <SeatQuotaBanner
        seat={{ used: 3, cap: 15, pending_invites: 0 }}
        expiringSoon={{ seats: 10, date: "2026-09-01T00:00:00.000Z" }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("แถบแดงชนะแถบเหลืองเมื่อเกิดพร้อมกัน", () => {
    renderBanner(
      <SeatQuotaBanner
        seat={{ used: 20, cap: 5, pending_invites: 0 }}
        expiringSoon={{ seats: 3, date: "2026-09-01T00:00:00.000Z" }}
      />,
    );
    expect(screen.queryByText(/จะเกินโควตา/)).not.toBeInTheDocument();
  });

  it("used === cap ไม่ถือว่าเกิน — เต็มพอดียังเขียนได้ (ล้อ evaluateSeat ฝั่ง backend)", () => {
    const { container } = renderBanner(
      <SeatQuotaBanner seat={{ used: 5, cap: 5, pending_invites: 0 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

// Task 5.3 fix round: SeatQuotaBannerHost เดิมไม่มีเทสต์คุมเลย ทั้งที่ sibling
// LicenseExpiredBanner มี test block เฉพาะสำหรับ enforced gate — ลอก convention นั้นมา
describe("SeatQuotaBannerHost", () => {
  type MockSeat = { used: number; cap: number; pending_invites: number };

  function setup(overrides: {
    enforced: boolean;
    seat?: MockSeat;
    expiringSoon?: { seats: number; date: string } | null;
  }) {
    license.mockReturnValue({
      enforced: overrides.enforced,
      seat: overrides.seat,
      expiringSoon: overrides.expiringSoon ?? null,
    });
  }

  function renderHost() {
    return render(
      <IntlProvider locale="th" messages={th} timeZone="Asia/Bangkok">
        <SeatQuotaBannerHost />
      </IntlProvider>,
    );
  }

  it("ไม่เรนเดอร์อะไรเลยเมื่อ enforced เป็น false — shadow mode ยังไม่บล็อกอะไรจริง", () => {
    setup({ enforced: false, seat: { used: 12, cap: 5, pending_invites: 0 } });
    const { container } = renderHost();
    expect(container).toBeEmptyDOMElement();
  });

  it("ไม่เรนเดอร์อะไรเลยเมื่อไม่มี seat เลย (gateway รุ่นเก่า/ยังไม่มีข้อมูล)", () => {
    setup({ enforced: true, seat: undefined });
    const { container } = renderHost();
    expect(container).toBeEmptyDOMElement();
  });

  it("ไม่เรนเดอร์อะไรเมื่อ enforced=true แต่ยังไม่เกินโควตาและไม่มีใบใกล้หมด", () => {
    setup({ enforced: true, seat: { used: 3, cap: 5, pending_invites: 0 } });
    const { container } = renderHost();
    expect(container).toBeEmptyDOMElement();
  });

  // นี่คือเทสต์ที่จะแดงถ้ามีใครใส่ admin/role gate เข้ามาทีหลัง — setup ไม่มีข้อมูล role
  // ใด ๆ เลย (ไม่มี isAdmin, ไม่มี permission) และแถบก็ยังต้องเรนเดอร์ตามปกติ
  it("เรนเดอร์แถบแดงเมื่อ enforced=true และ seat เกินโควตา — ไม่มีเงื่อนไข role ใด ๆ คั่นกลาง", () => {
    setup({ enforced: true, seat: { used: 12, cap: 5, pending_invites: 0 } });
    renderHost();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/12\/5/)).toBeInTheDocument();
  });

  it("ส่ง seat/expiringSoon จาก useLicense() ต่อให้ SeatQuotaBanner ตรง ๆ (เห็นแถบเหลืองได้)", () => {
    setup({
      enforced: true,
      seat: { used: 12, cap: 15, pending_invites: 0 },
      expiringSoon: { seats: 10, date: "2026-09-01T00:00:00.000Z" },
    });
    renderHost();
    expect(screen.getByText(/จะเกินโควตา/)).toBeInTheDocument();
  });
});
