#!/usr/bin/env bun
/**
 * จุดเข้าใช้ changelog generator จาก command line
 *
 *   bun scripts/changelog-cli.ts             re-render CHANGELOG.md จาก changelog.json
 *   bun scripts/changelog-cli.ts --rebuild   สร้าง changelog.json ใหม่จาก git tag (ทับของเดิม)
 *
 * แยกจาก scripts/changelog.ts เพื่อให้ไฟล์นั้นเป็น library ที่ import แล้วไม่ทำอะไร
 * (bump.ts import มัน) — ตัวเลือกปกติอย่าง `import.meta.main` ใช้ไม่ได้เพราะ repo
 * ไม่ได้ติดตั้ง @types/bun แล้ว `bun run typecheck` จะแดง
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { readChangelog, rebuildFromTags, renderMarkdown } from "./changelog";

if (process.argv.includes("--rebuild")) {
  rebuildFromTags();
} else {
  writeFileSync(
    path.resolve(import.meta.dirname, "..", "CHANGELOG.md"),
    renderMarkdown(readChangelog()),
  );
  console.log("✓ render CHANGELOG.md จาก changelog.json แล้ว");
}
