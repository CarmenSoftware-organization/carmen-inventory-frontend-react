import { describe, expect, it } from "vitest";
import { computePriceAlert } from "./pr-price-alert";

describe("computePriceAlert", () => {
  it("แพงกว่าครั้งก่อนถึงเกณฑ์ → ทัก พร้อมบอกกี่ % และราคาเดิม", () => {
    expect(computePriceAlert(520, 440)).toEqual({ diffPct: 18, lastCost: 440 });
  });

  it("แพงกว่าแต่ยังไม่ถึงเกณฑ์ → เงียบ", () => {
    expect(computePriceAlert(460, 440)).toBeNull(); // +4.5%
  });

  it("ถึงเกณฑ์พอดีก็ทัก — ไม่ใช่ต้องเกิน", () => {
    expect(computePriceAlert(110, 100)).toEqual({ diffPct: 10, lastCost: 100 });
  });

  it("ปรับเกณฑ์ได้", () => {
    expect(computePriceAlert(460, 440, 4)).toEqual({
      diffPct: 5,
      lastCost: 440,
    });
  });

  it("ถูกลงหรือเท่าเดิม → เงียบ (ทักเฉพาะขาแพงขึ้น)", () => {
    expect(computePriceAlert(400, 440)).toBeNull();
    expect(computePriceAlert(440, 440)).toBeNull();
  });

  it("ไม่เคยรับเข้า / ยังไม่กรอกราคา → เงียบ ไม่ใช่ทักว่าน่าสงสัย", () => {
    expect(computePriceAlert(520, null)).toBeNull();
    expect(computePriceAlert(520, undefined)).toBeNull();
    expect(computePriceAlert(null, 440)).toBeNull();
    expect(computePriceAlert(0, 440)).toBeNull();
  });

  it("ราคาเดิมเป็นศูนย์ → เงียบ ไม่ใช่หารด้วยศูนย์แล้วได้ Infinity%", () => {
    expect(computePriceAlert(520, 0)).toBeNull();
  });

  it("ค่าที่ไม่ใช่ตัวเลข → เงียบ ไม่ใช่ NaN%", () => {
    expect(computePriceAlert(Number.NaN, 440)).toBeNull();
    expect(computePriceAlert(520, Number.NaN)).toBeNull();
  });
});
