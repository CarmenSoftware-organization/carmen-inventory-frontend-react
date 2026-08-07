/**
 * ฝังภาพหน้าจอเป็น data URI ลง template ของ deck
 *
 * CSP ของ Artifact บล็อกทุกคำขอไปโฮสต์ภายนอก ภาพจึงต้องฝังมาในหน้า และ base64
 * ของสิบกว่าภาพพิมพ์ด้วยมือไม่ได้ template จึงใช้โทเคน {{IMG_01}}.. แล้วให้
 * สคริปต์นี้แทนที่ พร้อมเช็กงบขนาดไฟล์ให้ตั้งแต่ตอน build ไม่ต้องรอให้เผยแพร่ล้มเหลว
 *
 * รัน: bun scripts/investor/build-deck.mjs [ชื่อ template]
 *   ไม่ใส่อาร์กิวเมนต์ = สร้างทุก template ที่มีอยู่ (อังกฤษและไทย)
 *
 * ภาพชุดเดียวกันถูกใช้ร่วมกันทุกภาษา — เปลี่ยนภาพครั้งเดียวแล้ว build ใหม่ ได้ครบทุกฉบับ
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ASSETS = "docs/investor/assets";
const DECK_DIR = "docs/investor/deck";
const LIMIT_MB = 12;

const images = readdirSync(ASSETS)
  .filter((f) => f.endsWith(".jpg"))
  .sort()
  .map((file) => ({
    token: `{{IMG_${file.slice(0, 2)}}}`,
    uri: `data:image/jpeg;base64,${readFileSync(join(ASSETS, file)).toString("base64")}`,
    file,
  }));

const arg = process.argv[2];
const templates = arg
  ? [arg]
  : readdirSync(DECK_DIR).filter((f) => f.endsWith(".template.html"));

if (templates.length === 0) {
  console.error(`ไม่พบ template ใน ${DECK_DIR}`);
  process.exit(1);
}

let failed = false;

for (const name of templates.sort()) {
  const templatePath = join(DECK_DIR, name);
  const outputPath = join(DECK_DIR, name.replace(".template.html", ".html"));

  let html = readFileSync(templatePath, "utf8");
  let embedded = 0;

  for (const img of images) {
    if (!html.includes(img.token)) continue;
    html = html.split(img.token).join(img.uri);
    embedded++;
  }

  const leftover = html.match(/\{\{IMG_\d{2}\}\}/g);
  if (leftover) {
    console.error(
      `${name} — โทเคนที่ไม่มีไฟล์ภาพรองรับ: ${[...new Set(leftover)].join(", ")}`,
    );
    failed = true;
    continue;
  }

  writeFileSync(outputPath, html);

  const mb = Buffer.byteLength(html) / 1024 / 1024;
  console.log(`เขียน ${outputPath} — ฝัง ${embedded} ภาพ — ${mb.toFixed(2)} MB`);

  if (mb > LIMIT_MB) {
    console.error(
      `${name} — เกิน ${LIMIT_MB}MB ลดคุณภาพ JPEG เป็น 75 หรือย่อความกว้างลง แล้ว build ใหม่`,
    );
    failed = true;
  }
}

if (failed) process.exit(1);
