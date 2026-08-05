import fs from "node:fs";
import path from "node:path";

/**
 * เวอร์ชันแอปจาก `package.json` — แหล่งความจริงแหล่งเดียว
 *
 * ใช้โดย `vite.config.ts` และ `vitest.config.ts` เพื่อ define `__APP_VERSION__`
 * เข้า bundle ตอน build แทนการ hardcode ไว้ใน `lib/version.ts` (ของเดิม hardcode
 * ค้างตั้งแต่ 2026-05-27 แล้ว drift เงียบ ๆ) bump ด้วย `bun run build:bump`
 *
 * แยกเป็นไฟล์ของตัวเองแทนที่จะ copy ลงสอง config เพราะสำเนาสองชุดที่ต้อง sync
 * กันเองคือปัญหาที่ทั้งหมดนี้กำลังแก้อยู่พอดี
 *
 * @returns เลข semver จากฟิลด์ `version`
 * @throws ถ้าไม่มีฟิลด์ `version` ที่เป็น string — ดีกว่าฉีด `undefined` เข้า bundle เงียบ ๆ
 * @example
 * ```ts
 * define: { __APP_VERSION__: JSON.stringify(appVersion()) }
 * ```
 */
export function appVersion(): string {
  const file = path.resolve(import.meta.dirname, "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8")) as { version?: unknown };
  if (typeof pkg.version !== "string") {
    throw new Error(`${file} ไม่มีฟิลด์ version`);
  }
  return pkg.version;
}
