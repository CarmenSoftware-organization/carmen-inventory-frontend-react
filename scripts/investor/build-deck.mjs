/**
 * ฝังภาพหน้าจอเป็น data URI ลง template ของ deck
 *
 * CSP ของ Artifact บล็อกทุกคำขอไปโฮสต์ภายนอก ภาพจึงต้องฝังมาในหน้า และ base64
 * ของสิบกว่าภาพพิมพ์ด้วยมือไม่ได้ template จึงใช้โทเคน {{IMG_01}}.. แล้วให้
 * สคริปต์นี้แทนที่ พร้อมเช็กงบขนาดไฟล์ให้ตั้งแต่ตอน build ไม่ต้องรอให้เผยแพร่ล้มเหลว
 *
 * รัน: bun scripts/investor/build-deck.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ASSETS = "docs/investor/assets";
const TEMPLATE = "docs/investor/deck/carmen-tech-deck.template.html";
const OUTPUT = "docs/investor/deck/carmen-tech-deck.html";
const LIMIT_MB = 12;

const files = readdirSync(ASSETS)
  .filter((f) => f.endsWith(".jpg"))
  .sort();

let html = readFileSync(TEMPLATE, "utf8");
let embedded = 0;

for (const file of files) {
  const token = `{{IMG_${file.slice(0, 2)}}}`;
  if (!html.includes(token)) {
    console.warn(`ข้าม ${file} — template ไม่ได้อ้างโทเคน ${token}`);
    continue;
  }
  const b64 = readFileSync(join(ASSETS, file)).toString("base64");
  html = html.split(token).join(`data:image/jpeg;base64,${b64}`);
  embedded++;
}

const leftover = html.match(/\{\{IMG_\d{2}\}\}/g);
if (leftover) {
  console.error(
    `โทเคนที่ไม่มีไฟล์ภาพรองรับ: ${[...new Set(leftover)].join(", ")}`,
  );
  process.exit(1);
}

writeFileSync(OUTPUT, html);

const mb = Buffer.byteLength(html) / 1024 / 1024;
console.log(`เขียน ${OUTPUT} — ฝัง ${embedded} ภาพ — ${mb.toFixed(2)} MB`);

if (mb > LIMIT_MB) {
  console.error(
    `เกิน ${LIMIT_MB}MB — ลดคุณภาพ JPEG เป็น 75 หรือย่อความกว้างลง แล้ว build ใหม่`,
  );
  process.exit(1);
}
