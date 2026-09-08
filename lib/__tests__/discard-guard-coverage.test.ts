import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * ฟอร์มเต็มหน้าทุกใบต้องกันข้อมูลหายด้วย **สอง** hook ไม่ใช่หนึ่ง
 *
 * `useDiscardConfirm` เป็น opt-in — มันไม่ได้ดักอะไรเลย แค่ห่อ action ที่ฟอร์ม
 * เรียกเอง (ปุ่ม Cancel / Back) ส่วนลิงก์ที่พาออกจากหน้าอย่างเมนู sidebar
 * (react-router `<Link>` = `<a href>`) ต้องมี `useNavigationGuard` ที่ติด click
 * listener ระดับ capture ที่ document ถึงจะดักได้
 *
 * เคยมี 13 ฟอร์มที่มีแต่ตัวแรก กรอกค้างไว้แล้วกดเมนูก็หลุดออกไปเงียบ ๆ พร้อม
 * ข้อมูลที่ยังไม่ได้เซฟ — เป็นบั๊กที่ไม่มีใครเห็นจนกว่าจะเสียงานจริง และมองจาก
 * ไฟล์เดียวไม่ออกว่าขาด เพราะไฟล์นั้น "ก็มี discard dialog อยู่นี่"
 *
 * เทสต์นี้จึงเป็นเทสต์ระดับ repo ไม่ใช่ต่อไฟล์ — ฟอร์มใหม่ที่ลอก pattern เก่ามา
 * จะแดงทันทีตั้งแต่ไฟล์แรกที่เขียน
 */
const ROUTES = join(import.meta.dirname, "../../routes");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith(".tsx") ? [full] : [];
  });
}

/** ไฟล์ที่ hook อยู่คนละไฟล์กับ JSX — guard อยู่ใน use-*-actions/handlers ข้าง ๆ */
function guardedBySibling(file: string): boolean {
  const dir = join(file, "..");
  return readdirSync(dir).some(
    (name) =>
      /^use-.*-(actions|handlers)\.tsx?$/.test(name) &&
      readFileSync(join(dir, name), "utf-8").includes("useNavigationGuard"),
  );
}

describe("discard guard — ฟอร์มที่มี useDiscardConfirm ต้องมี useNavigationGuard ด้วย", () => {
  it("ไม่มีฟอร์มไหนกันแค่ปุ่มในตัวเองแล้วปล่อยลิงก์ข้างนอกหลุด", () => {
    const unguarded = walk(ROUTES)
      .filter((file) => {
        const src = readFileSync(file, "utf-8");
        return (
          src.includes("useDiscardConfirm") &&
          !src.includes("useNavigationGuard") &&
          !guardedBySibling(file)
        );
      })
      .map((file) => file.slice(ROUTES.length + 1));

    expect(unguarded).toEqual([]);
  });
});
