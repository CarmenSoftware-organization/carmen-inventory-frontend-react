import { describe, it, expect } from "vitest";
import type { PurchaseOrder } from "@/types/purchase-order";
import { buildPrSourceMap } from "./pr-source-button";

const po = (details: unknown[]) =>
  ({ purchase_order_detail: details }) as unknown as PurchaseOrder;

const pr = (pr_id: string | null, pr_no: string | null) => ({ pr_id, pr_no });

describe("buildPrSourceMap", () => {
  it("รวบใบขอซื้อต้นทางตาม id ของแถว", () => {
    const map = buildPrSourceMap(
      po([{ id: "d1", pr_details: [pr("p1", "PR-001"), pr("p2", "PR-002")] }]),
    );
    expect(map.get("d1")).toEqual([
      { id: "p1", no: "PR-001" },
      { id: "p2", no: "PR-002" },
    ]);
  });

  // ใบเดียวตัดมาหลายบรรทัดลงแถวเดียวกันได้ — คนอ่านสนใจว่ามาจากใบไหน ไม่ใช่กี่บรรทัด
  it("ใบเดียวกันซ้ำหลายบรรทัด นับเป็นใบเดียว", () => {
    const map = buildPrSourceMap(
      po([{ id: "d1", pr_details: [pr("p1", "PR-001"), pr("p1", "PR-001")] }]),
    );
    expect(map.get("d1")).toHaveLength(1);
  });

  // แถวที่สร้างเองหรือมาจาก price list ไม่มีต้นทาง — ต้องไม่ติดมาในแมป ปุ่มจะได้ไม่โผล่
  it("แถวที่ไม่มีต้นทางไม่ติดมาในแมป", () => {
    const map = buildPrSourceMap(
      po([
        { id: "d1", pr_details: [pr(null, null)] },
        { id: "d2", pr_details: [] },
        { id: "d3" },
      ]),
    );
    expect(map.size).toBe(0);
  });

  it("ไม่มีเลขที่ใบ ใช้ id แทนเพื่อให้ยังกดเข้าไปดูได้", () => {
    const map = buildPrSourceMap(po([{ id: "d1", pr_details: [pr("p1", null)] }]));
    expect(map.get("d1")).toEqual([{ id: "p1", no: "p1" }]);
  });

  it("ไม่มีใบเลย → แมปว่าง", () => {
    expect(buildPrSourceMap(undefined).size).toBe(0);
  });
});
