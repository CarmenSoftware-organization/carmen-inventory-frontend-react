import { describe, expect, it } from "vitest";
import { computePriceAlert, pickCheaperOption } from "./pr-price-alert";

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

describe("pickCheaperOption", () => {
  const lists = [
    { vendor_name: "A", price: 520, pricelist_detail_id: "cur" },
    { vendor_name: "B", price: 445, pricelist_detail_id: "b" },
    { vendor_name: "C", price: 480, pricelist_detail_id: "c" },
  ];

  it("เลือกเจ้าที่ถูกที่สุด พร้อมบอกประหยัดกี่ %", () => {
    expect(pickCheaperOption(lists, 520, "cur")).toEqual({
      vendorName: "B",
      price: 445,
      savingPct: 14,
    });
  });

  it("ตัดตัวที่เลือกอยู่ออกด้วย id ไม่ใช่ราคา — เจ้าอื่นที่ถูกเท่ากันต้องไม่หาย", () => {
    const same = [
      { vendor_name: "A", price: 400, pricelist_detail_id: "cur" },
      { vendor_name: "B", price: 400, pricelist_detail_id: "b" },
      { vendor_name: "C", price: 380, pricelist_detail_id: "c" },
    ];
    expect(pickCheaperOption(same, 400, "cur")?.vendorName).toBe("C");
  });

  it("ไม่มีใครถูกกว่า → เงียบ", () => {
    expect(pickCheaperOption(lists, 400, "cur")).toBeNull();
  });

  it("รายการว่าง / ราคาปัจจุบันใช้ไม่ได้ → เงียบ", () => {
    expect(pickCheaperOption([], 520, "cur")).toBeNull();
    expect(pickCheaperOption(undefined, 520, "cur")).toBeNull();
    expect(pickCheaperOption(lists, 0, "cur")).toBeNull();
  });

  it("ข้ามตัวเลือกที่ราคาไม่ใช่ตัวเลขหรือเป็นศูนย์", () => {
    const dirty = [
      { vendor_name: "X", price: 0, pricelist_detail_id: "x" },
      { vendor_name: "Y", price: Number.NaN, pricelist_detail_id: "y" },
      { vendor_name: "Z", price: 450, pricelist_detail_id: "z" },
    ];
    expect(pickCheaperOption(dirty, 520, "cur")?.vendorName).toBe("Z");
  });
});
