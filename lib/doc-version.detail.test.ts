import { describe, it, expect } from "vitest";
import { withFreshDetailVersions } from "@/lib/doc-version";

/**
 * บั๊กจริง 2026-09-09: แก้ค่า → Save → แก้อีกรอบ → Submit ได้
 * `409 (model=tb_purchase_request_detail, expected doc_version=3)`
 * — lock ของ backend เช็คราย detail ด้วย ไม่ใช่แค่หัวเอกสาร
 */
describe("withFreshDetailVersions", () => {
  const fresh = [
    { id: "a", doc_version: 3 },
    { id: "b", doc_version: 7 },
  ];

  it("ทับเลขของแถวที่ตรง id", () => {
    const out = withFreshDetailVersions(
      [{ id: "a", doc_version: 1, qty: 5 }],
      fresh,
    );
    expect(out).toEqual([{ id: "a", doc_version: 3, qty: 5 }]);
  });

  it("แถวที่ไม่มีใน fresh ปล่อยไว้เหมือนเดิม ไม่ลบ ไม่ตั้งเป็น undefined", () => {
    const out = withFreshDetailVersions(
      [{ id: "zzz", doc_version: 1 }],
      fresh,
    );
    expect(out).toEqual([{ id: "zzz", doc_version: 1 }]);
  });

  it("ทับหลายแถวพร้อมกัน แต่ละแถวได้เลขของตัวเอง", () => {
    const out = withFreshDetailVersions(
      [
        { id: "a", doc_version: 1 },
        { id: "b", doc_version: 1 },
      ],
      fresh,
    );
    expect(out).toEqual([
      { id: "a", doc_version: 3 },
      { id: "b", doc_version: 7 },
    ]);
  });

  it("doc_version = 0 ของ fresh ต้องทับได้ ไม่ใช่ถูกมองว่าไม่มีค่า", () => {
    const out = withFreshDetailVersions([{ id: "a", doc_version: 9 }], [
      { id: "a", doc_version: 0 },
    ]);
    expect(out).toEqual([{ id: "a", doc_version: 0 }]);
  });

  it("fresh ไม่มี doc_version มาให้ → ไม่ทับ (คงค่าเดิมไว้ดีกว่าเซ็ต undefined)", () => {
    const out = withFreshDetailVersions([{ id: "a", doc_version: 9 }], [
      { id: "a" },
    ]);
    expect(out).toEqual([{ id: "a", doc_version: 9 }]);
  });

  it("ไม่มีอะไรให้ทำ → คืนตัวเดิมกลับไปเลย", () => {
    const update = [{ id: "a", doc_version: 1 }];
    expect(withFreshDetailVersions(update, [])).toBe(update);
    expect(withFreshDetailVersions(update, undefined)).toBe(update);
    expect(withFreshDetailVersions(undefined, fresh)).toBeUndefined();
    expect(withFreshDetailVersions([], fresh)).toEqual([]);
  });

  it("ไม่แก้ของเดิม (คืน array/ออบเจกต์ใหม่)", () => {
    const row = { id: "a", doc_version: 1 };
    const out = withFreshDetailVersions([row], fresh);
    expect(row.doc_version).toBe(1);
    expect(out?.[0]).not.toBe(row);
  });
});
