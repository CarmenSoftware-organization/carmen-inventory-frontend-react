import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * เอกสารที่มี workflow ทุกใบใช้ optimistic lock ด้วย `doc_version` — ส่งเลขเก่าไป
 * = 409 กติกาคือ **ทุก mutation ต้องไปเอาเลขสดจาก DB ก่อนยิง** ไม่ใช่เชื่อค่าใน
 * ฟอร์ม (ซึ่งสดก็ต่อเมื่อ response ของ save รอบก่อนส่ง doc_version กลับมา ซึ่ง
 * ไม่การันตี) และไม่ใช่ค่าจาก prop ตอนโหลดหน้า (เก่าที่สุด)
 *
 * บั๊กจริงที่เจอ 2026-09-09: PR/PO/CN ไป GET สดเฉพาะตอนยิง workflow action แต่
 * `/save` อ่านค่าจากฟอร์มตรง ๆ ส่วน GRN ไม่มี GET สดเลยทั้งไฟล์ และ commit (ตัด
 * สต๊อกจริง ย้อนไม่ได้) ใช้ค่าจาก prop · SR เป็นตัวเดียวที่ทำถูกมาแต่แรก
 *
 * เทสต์นี้อ่าน **ซอร์ส** ไม่ใช่ DOM เพราะสิ่งที่การันตีคือลำดับการเรียกกับที่มาของ
 * ค่า ซึ่ง render tree มองไม่เห็น (ทรงเดียวกับ permission-denied-dialog.test.tsx)
 */
const HANDLERS: Record<string, string> = {
  PR: "procurement/purchase-request/use-pr-form-actions.ts",
  PO: "procurement/purchase-order/use-po-form-handlers.ts",
  CN: "procurement/credit-note/cn-form.tsx",
  GRN: "procurement/goods-receive-note/use-grn-form-actions.ts",
  SR: "store-operation/store-requisition/use-sr-form-actions.ts",
};

const sources = Object.fromEntries(
  Object.entries(HANDLERS).map(([name, rel]) => [
    name,
    readFileSync(join(__dirname, rel), "utf8"),
  ]),
);

/** ตัดคอมเมนต์ออกก่อนตรวจ — คอมเมนต์เล่าประวัติบั๊กได้ ไม่ใช่โค้ดที่รัน */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
}

describe.each(Object.keys(HANDLERS))("%s", (name) => {
  const src = () => code(sources[name]);

  it("มีกลไกไป GET เลขสดจาก DB", () => {
    expect(src()).toMatch(/fetchFresh\w*\s*=/);
  });

  it("ไม่ส่ง doc_version จากค่าในฟอร์มตรง ๆ", () => {
    // `doc_version: values.doc_version` คือรูปแบบของบั๊กเดิมเป๊ะ ๆ — ค่าในฟอร์ม
    // ใช้เป็น **fallback ชั้นสอง** ได้ (ผ่าน pickDocVersion) แต่ห้ามเป็นค่าหลัก
    expect(src()).not.toMatch(/doc_version:\s*values\.doc_version\b/);
  });

  it("ไม่ส่ง doc_version จาก prop ตอนโหลดหน้าตรง ๆ", () => {
    // เช่น `doc_version: goodsReceiveNote.doc_version ?? 0` — เก่าที่สุดในบรรดา
    // แหล่งทั้งหมด ใช้เป็น fallback ชั้นสามได้ ไม่ใช่ค่าหลัก
    expect(src()).not.toMatch(
      /doc_version:\s*(?!values\b)[a-zA-Z]+\.doc_version\s*\?\?\s*0/,
    );
  });
});

describe("ของกลาง", () => {
  it("โมดูลที่เคยพังใช้ pickDocVersion ตัวเดียวกัน ไม่เขียนลำดับ fallback เอง", () => {
    // SR ไม่อยู่ในลิสต์ — มันส่ง object `fresh` เข้า buildSaveDetails ของตัวเอง
    // และทำถูกมาแต่แรก ไม่มีเหตุให้ไปแก้ของที่ไม่พัง
    for (const name of ["PR", "PO", "CN", "GRN"]) {
      expect(code(sources[name]), name).toContain("pickDocVersion");
    }
  });

  it("ทุกไฟล์เตือนเมื่อดึงเลขสดไม่สำเร็จ ไม่ปล่อยเงียบ", () => {
    // catch เปล่า ๆ ทำให้ fallback ไปใช้เลขเก่าโดยไม่มีใครรู้ แล้วไปโผล่เป็น 409
    // ปลายทางซึ่งสาวกลับมาถึงบรรทัดที่ล้มไม่ได้
    for (const name of ["PR", "PO", "CN", "GRN"]) {
      expect(code(sources[name]), name).toContain("console.warn");
    }
  });
});
