import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * เพิ่มเลข patch ใน `package.json` ทุกครั้งที่ `bun run build` — รันก่อน `vite build`
 * เพื่อให้ `__APP_VERSION__` ที่ฉีดเข้า bundle เป็นเลขใหม่
 *
 * ข้ามเมื่อ build นอกเครื่องนักพัฒนา (`CI` ถูกตั้ง หรือไม่มี `.git` — Docker ตัด `.git`
 * ทิ้งใน `.dockerignore`, `vercel --prod` ไม่อัปโหลดขึ้นไป) เพราะเลขที่เพิ่มในเครื่องพวกนั้น
 * ไม่ไหลกลับมาที่ repo ทุก build ที่นั่นจะได้ "เลขในเครื่อง + 1" ซ้ำกันไปเรื่อย ๆ —
 * ข้ามแล้ว bundle จะใช้เลขที่ commit/อัปโหลดขึ้นไปแทน ปิดเองได้ด้วย `SKIP_VERSION_BUMP=1`
 *
 * เลขนี้ไม่ใช่ release: release ยังตัดด้วย `bun run build:bump` (tag + changelog)
 * และ What's New เทียบกับ `__APP_RELEASE__` ไม่ใช่เลขนี้ — ดู `appRelease()`
 */
const root = path.resolve(import.meta.dirname, "..");

function skipReason(): string | null {
  if (process.env.SKIP_VERSION_BUMP === "1") return "SKIP_VERSION_BUMP=1";
  if (process.env.CI) return "CI";
  if (!existsSync(path.join(root, ".git"))) return "ไม่มี .git";
  return null;
}

const reason = skipReason();
const file = path.join(root, "package.json");
const pkg = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
const current = pkg.version;
const m =
  typeof current === "string" ? /^(\d+)\.(\d+)\.(\d+)$/.exec(current) : null;
if (!m) {
  console.error(
    `✗ package.json version ไม่ใช่ MAJOR.MINOR.PATCH: ${String(current)}`,
  );
  process.exit(1);
}

if (reason) {
  console.log(`▸ version .......... ${current} (ไม่ bump: ${reason})`);
} else {
  const next = `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
  pkg.version = next;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`▸ version .......... ${current} → ${next}`);
}
