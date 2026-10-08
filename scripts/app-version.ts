import { execFileSync } from "node:child_process";
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
  const pkg = JSON.parse(fs.readFileSync(file, "utf8")) as {
    version?: unknown;
  };
  if (typeof pkg.version !== "string") {
    throw new Error(`${file} ไม่มีฟิลด์ version`);
  }
  return pkg.version;
}

/**
 * git commit สั้นของบิลด์ที่กำลัง build อยู่
 *
 * ไล่หาตามลำดับ `APP_COMMIT_SHA` → `VERCEL_GIT_COMMIT_SHA` → `git rev-parse`
 * เพราะที่ build จริงหลายที่ไม่มี `.git` ให้อ่าน — Docker ตัดทิ้งใน
 * `.dockerignore` และ `vercel --prod` ก็ไม่อัปโหลดขึ้นไป ถ้าพึ่ง git อย่างเดียว
 * บิลด์บนพวกนั้นจะได้ `unknown` เสมอ (ส่งค่าเข้ามาเองได้ผ่าน env)
 *
 * @returns commit 7 ตัวอักษร หรือ `unknown` เมื่อหาไม่ได้ (คำเดียวกับที่ backend `/version` ใช้)
 */
export function appCommit(): string {
  const fromEnv =
    process.env.APP_COMMIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: import.meta.dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * เลข release ล่าสุดจาก `changelog.json` (`current`) — เขียนโดย `bun run build:bump` เท่านั้น
 *
 * แยกจาก `appVersion()` เพราะเลขใน package.json ขึ้นทุก build (`scripts/bump-build.ts`)
 * ถ้า What's New เทียบกับเลขนั้น ผู้ใช้จะเจอ dialog ของ release เดิมซ้ำทุกครั้งที่ deploy
 *
 * @returns semver ของ release ล่าสุด หรือ `appVersion()` ถ้ายังไม่มี changelog
 */
export function appRelease(): string {
  const file = path.resolve(import.meta.dirname, "..", "changelog.json");
  try {
    const log = JSON.parse(fs.readFileSync(file, "utf8")) as {
      current?: unknown;
    };
    if (typeof log.current === "string") return log.current;
  } catch {
    // ไม่มีไฟล์ / อ่านไม่ได้ — ตกไปใช้เลขใน package.json
  }
  return appVersion();
}
