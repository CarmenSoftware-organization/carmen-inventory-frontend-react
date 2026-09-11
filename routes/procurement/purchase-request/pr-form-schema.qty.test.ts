import { describe, it, expect } from "vitest";
import { createPrSchema, findRowsMissingQty, PR_ITEM } from "./pr-form-schema";

// tv/tf คืน key ตรง ๆ — เทสต์นี้สนใจว่า "แดงที่ช่องไหน เพราะกฎข้อไหน"
// ไม่ได้สนใจข้อความที่แปลแล้ว (ข้อความจริงอยู่ใน messages/*.json)
const tv = (key: string) => key;
const tf = (key: string) => key;

/** PR_ITEM เป็น `as const` — ชนิดของ requested_qty/foc_qty เลยแคบเป็น literal 0
 *  ประกาศเฉพาะสองช่องที่เทสต์นี้เปลี่ยนจริง ให้เป็น number ธรรมดา */
interface QtyOverrides {
  requested_qty: number;
  foc_qty: number;
}

/** แถวที่กรอกครบทุกช่องบังคับ ยกเว้นจำนวนที่ให้เทสต์เป็นคนกำหนด */
function item(overrides: QtyOverrides) {
  return {
    ...PR_ITEM,
    product_id: "prd-1",
    location_id: "loc-1",
    requested_unit_id: "unit-1",
    delivery_point_id: "dp-1",
    delivery_date: "2026-09-10",
    ...overrides,
  };
}

/** error ที่ schema (= ตอนกด Save) ออกให้ช่องจำนวนที่ขอ */
function saveIssues(overrides: QtyOverrides) {
  const result = createPrSchema(tv, tf).safeParse({
    pr_date: "2026-09-09",
    description: "",
    workflow_id: "wf-1",
    requestor_id: "u-1",
    department_id: "dept-1",
    items: [item(overrides)],
  });
  if (result.success) return [];
  return result.error.issues.filter(
    (i) => i.path.join(".") === "items.0.requested_qty",
  );
}

describe("findRowsMissingQty — ด่านตอนส่งใบ", () => {
  it("ขอ > 0 ไม่มี FOC → ผ่าน", () => {
    expect(findRowsMissingQty([{ requested_qty: 2, foc_qty: 0 }])).toEqual([]);
  });

  it("ขอ 0 แต่มี FOC → ผ่าน (ของที่ได้ฟรีล้วน)", () => {
    expect(findRowsMissingQty([{ requested_qty: 0, foc_qty: 3 }])).toEqual([]);
  });

  it("ขอ 0 และ FOC 0 → ไม่ผ่าน", () => {
    expect(findRowsMissingQty([{ requested_qty: 0, foc_qty: 0 }])).toEqual([0]);
  });

  it("คืน index ของทุกแถวที่ไม่ผ่าน ไม่ใช่แค่แถวแรก", () => {
    expect(
      findRowsMissingQty([
        { requested_qty: 1, foc_qty: 0 },
        { requested_qty: 0, foc_qty: 0 },
        { requested_qty: 0, foc_qty: 2 },
        { requested_qty: 0, foc_qty: 0 },
      ]),
    ).toEqual([1, 3]);
  });

  it("ทศนิยมนับเป็นค่ามากกว่า 0 — ไม่ได้บังคับจำนวนเต็ม", () => {
    expect(findRowsMissingQty([{ requested_qty: 0.5, foc_qty: 0 }])).toEqual(
      [],
    );
    expect(findRowsMissingQty([{ requested_qty: 0, foc_qty: 0.25 }])).toEqual(
      [],
    );
  });

  it("ใบเปล่าไม่มีแถวเลย → ไม่มีอะไรให้บล็อก (ใบเปล่ามี zod กันอยู่แล้ว)", () => {
    expect(findRowsMissingQty([])).toEqual([]);
  });
});

describe("schema ตอนกด Save — ร่างที่ยังไม่ใส่จำนวนต้องเซฟได้", () => {
  it("ขอ 0 และ FOC 0 → schema ไม่บล็อก", () => {
    expect(saveIssues({ requested_qty: 0, foc_qty: 0 })).toEqual([]);
  });

  it("ค่าติดลบยังกันอยู่ที่ schema", () => {
    const issues = saveIssues({ requested_qty: -1, foc_qty: 5 });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.map((i) => i.message)).toContain("minNumber");
  });
});
