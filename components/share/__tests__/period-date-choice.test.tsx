import { describe, it, expect } from "vitest";
import { isOutsideOpenPeriod } from "@/lib/date-utils";
import { resolvePeriodDate } from "../period-date-choice";

const period = {
  start_at: "2026-06-01T00:00:00.000Z",
  end_at: "2026-06-30T23:59:59.000Z",
};

describe("isOutsideOpenPeriod", () => {
  it.each([
    ["2026-06-08T00:00:00.000Z", false],
    ["2026-06-01T00:00:00.000Z", false],
    ["2026-06-30T10:00:00.000Z", false],
    ["2026-08-08T00:00:00.000Z", true],
    ["2026-05-31T00:00:00.000Z", true],
  ])("%s → %s", (docDate, expected) => {
    expect(isOutsideOpenPeriod(docDate, period)).toBe(expected);
  });

  // ไม่รู้ว่างวดไหนเปิด = อย่าไปขวางผู้ใช้ ปล่อย backend ตัดสิน
  it("ไม่มีงวดเปิดอยู่ → ไม่ถือว่าเลยงวด", () => {
    expect(isOutsideOpenPeriod("2026-08-08T00:00:00.000Z", undefined)).toBe(
      false,
    );
  });
});

describe("resolvePeriodDate", () => {
  it("เลือกย้ายเข้างวด → ได้วันแรกของงวด", () => {
    expect(
      resolvePeriodDate("open-period", "2026-08-08T00:00:00.000Z", period),
    ).toBe(period.start_at);
  });

  it("เลือกคงวันเดิม → ไม่ต้องแตะวันที่", () => {
    expect(
      resolvePeriodDate("document", "2026-08-08T00:00:00.000Z", period),
    ).toBeNull();
  });

  // วันที่อยู่ในงวดอยู่แล้วไม่มีอะไรให้ย้าย — กันเคสที่ state ค้างจากใบก่อนหน้า
  // แล้วไปลากวันที่ของใบที่ปกติดีให้เพี้ยน
  it("วันที่อยู่ในงวดแล้ว → ไม่ย้ายแม้จะเลือก open-period ค้างไว้", () => {
    expect(
      resolvePeriodDate("open-period", "2026-06-08T00:00:00.000Z", period),
    ).toBeNull();
  });

  it("ไม่มีงวด → ไม่ย้าย", () => {
    expect(
      resolvePeriodDate("open-period", "2026-08-08T00:00:00.000Z", undefined),
    ).toBeNull();
  });
});
