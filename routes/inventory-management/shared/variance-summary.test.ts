import { describe, it, expect } from "vitest";
import { summarizeVariance } from "./variance-summary";

interface Row {
  id: string;
  diff_qty: number;
  actual_qty?: number | null;
}

const rows = (...diffs: number[]): Row[] =>
  diffs.map((d, i) => ({ id: `r${i}`, diff_qty: d, actual_qty: 1 }));

const getDiff = (r: Row) => r.diff_qty;

describe("summarizeVariance", () => {
  it("ไม่มีแถว = ศูนย์ทุกช่อง ไม่ใช่ NaN", () => {
    expect(summarizeVariance([], { getDiff })).toEqual({
      matches: 0,
      variances: 0,
      overages: 0,
      shortages: 0,
      varianceItems: [],
    });
    expect(summarizeVariance(undefined, { getDiff }).matches).toBe(0);
  });

  it("ผลต่าง 0 = ตรง · บวก = เกิน · ลบ = ขาด", () => {
    const s = summarizeVariance(rows(0, 0, 3, -2, -1), { getDiff });
    expect(s.matches).toBe(2);
    expect(s.overages).toBe(1);
    expect(s.shortages).toBe(2);
  });

  it("จำนวนที่ไม่ตรง = เกิน + ขาด เสมอ", () => {
    const s = summarizeVariance(rows(0, 5, -5, 0, 2), { getDiff });
    expect(s.variances).toBe(s.overages + s.shortages);
    expect(s.variances).toBe(s.varianceItems.length);
  });

  it("varianceItems มีเฉพาะแถวที่ไม่ตรง และคงลำดับเดิม", () => {
    const s = summarizeVariance(rows(0, -1, 0, 4), { getDiff });
    expect(s.varianceItems.map((r) => r.id)).toEqual(["r1", "r3"]);
  });

  it("แถวที่ยังไม่ได้นับถูกข้าม ไม่ถูกนับเป็น 'ตรง'", () => {
    // นี่คือกติกาของหน้านับสต๊อก: actual_qty ยังเป็น null แปลว่ายังไม่มีใครไปนับ
    // นับรวมเป็น "ตรง" คือรายงานว่านับครบแล้วทั้งที่ยังไม่ครบ
    const list: Row[] = [
      { id: "a", diff_qty: 0, actual_qty: 10 },
      { id: "b", diff_qty: 0, actual_qty: null },
      { id: "c", diff_qty: -2, actual_qty: 8 },
    ];
    const s = summarizeVariance(list, {
      getDiff,
      isCounted: (r) => r.actual_qty != null,
    });
    expect(s.matches).toBe(1);
    expect(s.shortages).toBe(1);
    expect(s.variances).toBe(1);
  });

  it("ไม่ส่ง isCounted = นับทุกแถวที่ให้มา (ของ spot check ที่ส่งมาเฉพาะที่นับแล้ว)", () => {
    const list: Row[] = [{ id: "a", diff_qty: 0, actual_qty: null }];
    expect(summarizeVariance(list, { getDiff }).matches).toBe(1);
  });

  it("ผลต่างที่เป็นทศนิยมก็แยกเกิน/ขาดได้ — สต๊อกมีหน่วยทศนิยม (2.5 kg)", () => {
    const s = summarizeVariance(rows(0.5, -0.25), { getDiff });
    expect(s.overages).toBe(1);
    expect(s.shortages).toBe(1);
  });
});
