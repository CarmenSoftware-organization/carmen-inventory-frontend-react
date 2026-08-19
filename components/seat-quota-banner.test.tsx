import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import th from "@/messages/th.json";
import { SeatQuotaBanner } from "./seat-quota-banner";

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
