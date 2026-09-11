import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * เทสต์นี้อ่าน **ซอร์ส** ไม่ใช่ DOM — สิ่งที่ต้องการันตีคือ "ทุก mutation ยิงหลัง
 * ไปเอา doc_version สดมาแล้ว" ซึ่งเป็นเรื่องของลำดับการเรียก render tree มองไม่เห็น
 * (ทรงเดียวกับ components/permission-denied-dialog.test.tsx ที่ assert บนซอร์ส)
 *
 * บั๊กที่กันอยู่: /save เคยเป็น mutation เดียวที่อ่าน values.doc_version จากฟอร์ม
 * ตรง ๆ ส่วน submit/approve/reject/review ไป GET สดกันหมด พอ backend ไม่ส่ง
 * doc_version กลับมาใน response ของ /save ฟอร์มก็ค้างเลขเดิม แล้ว /save ครั้งถัดไป
 * (ที่ปุ่ม Submit เรียก) ส่งเลขเก่าซ้ำ → 409
 */
const SOURCE = readFileSync(
  join(__dirname, "use-pr-form-actions.ts"),
  "utf8",
);

/** ยุบช่องว่างให้เหลือช่องเดียว — prettier จัดบรรทัดใหม่ตอนอาร์กิวเมนต์เพิ่ม
 *  แต่ invariant ที่เทสต์นี้ดูคือ "เรียกด้วยค่าอะไร" ไม่ใช่ "ขึ้นบรรทัดตรงไหน" */
const FLAT = SOURCE.replace(/\s+/g, " ");

describe("PR — ทุก mutation ต้องได้ doc_version สดก่อนยิง", () => {
  const savePayloadCalls = [
    // ปุ่ม Save ในโหมด edit
    "buildSaveDetails( values, resolveDocVersion(fresh), fresh?.purchase_request_detail, )",
    // /save ก่อน workflow action (approve/reject/send back)
    "buildSaveDetails( form.getValues(), resolveDocVersion(fresh), fresh?.purchase_request_detail, )",
    // /save ที่ปุ่ม Submit เรียก
    "buildCreateDetails( values, resolveDocVersion(fresh), fresh?.purchase_request_detail, )",
  ];

  it.each(savePayloadCalls)(
    "/save ส่งทั้ง version ของหัวเอกสารและของราย row: %s",
    (call) => {
      expect(FLAT).toContain(call);
    },
  );

  it("ไม่มี /save จุดไหนอ่าน doc_version จากฟอร์มโดยตรงอีก", () => {
    // เหลือได้จุดเดียวคือ fallback ใน buildCreateDetails สำหรับใบใหม่ (ไม่มี id
    // ให้ GET) — นับให้แน่ใจว่าไม่มีใครแอบเพิ่มจุดที่สอง
    const hits = SOURCE.match(/values\.doc_version/g) ?? [];
    expect(hits).toHaveLength(2); // เงื่อนไข ternary + ค่าที่ใส่ ในบรรทัดเดียวกัน
  });

  it.each([
    ["doSubmitPr", "const fresh = await fetchFreshPr(prId);"],
    ["doSaveAndSubmitPr", "const fresh = await fetchFreshPr(purchaseRequest.id);"],
    ["saveDirtyEdits", "const fresh = await fetchFreshPr(purchaseRequest.id);"],
  ])("%s ยิง GET สดก่อน mutate", (_name, fetchLine) => {
    expect(SOURCE).toContain(fetchLine);
  });

  it("ทุกจุดที่ resolveDocVersion(fresh) ถูกเรียก มี fetchFreshPr นำหน้าอยู่ใกล้ ๆ", () => {
    const uses = [...SOURCE.matchAll(/resolveDocVersion\(fresh\)/g)];
    // 3 จุดของ /save + 5 workflow action (submit/approve/purchase/reject/review)
    expect(uses.length).toBeGreaterThanOrEqual(8);

    for (const m of uses) {
      // มองย้อนขึ้นไป 400 ตัวอักษร — พอสำหรับ handler หนึ่งตัว แต่ไม่กว้างจนไป
      // เจอ fetchFreshPr ของ handler ก่อนหน้า (ตัวที่สั้นที่สุดห่างกัน ~120 ตัว)
      const window = SOURCE.slice(Math.max(0, (m.index ?? 0) - 400), m.index);
      expect(
        window,
        `resolveDocVersion(fresh) ที่ตำแหน่ง ${m.index} ไม่มี fetchFreshPr นำหน้า`,
      ).toContain("fetchFreshPr(");
    }
  });

  it("fetchFreshPr ไม่กลืน error เงียบ ๆ", () => {
    // catch เปล่า ๆ ทำให้ GET ล้มแล้ว fallback ไปใช้เลขเก่าโดยไม่มีใครรู้ ปลายทาง
    // คือ 409 ที่สาวกลับมาไม่ถึงบรรทัดนี้
    const fn = SOURCE.slice(
      SOURCE.indexOf("const fetchFreshPr"),
      SOURCE.indexOf("const resolveDocVersion"),
    );
    expect(fn).toContain("console.warn");
    expect(fn).not.toMatch(/catch\s*\{\s*\/\/[^\n]*\n\s*\}/);
  });
});
