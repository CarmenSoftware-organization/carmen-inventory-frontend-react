import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard ของ security headers — ค่าชุดเดียวกันถูกประกาศไว้ 4 ที่ ที่ไม่มีอะไรผูกกันเลย
 * เพราะแต่ละปลายทาง deploy คนละรูปแบบ (nginx conf · vercel.json · gcloud flag ·
 * CloudFront policy JSON)
 *
 * ตัวที่อันตรายที่สุดคือ `script-src` hash ของ inline script ใน index.html — วันที่มีคน
 * แก้สคริปต์นั้นแม้แต่ตัวอักษรเดียว hash จะไม่ตรง แล้ว **สคริปต์จะถูกบล็อกเงียบ ๆ ใน
 * production ทุกปลายทาง** (หน้าเว็บยังขึ้น แค่ font-scale ไม่ทำงาน) ไม่มี test ไหนจับได้
 * เพราะ dev server ไม่มี CSP เลย — test นี้อ่านไฟล์จริงจาก disk มาเทียบให้
 */
const ROOT = join(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf-8");

/** ไฟล์ config ของทุกปลายทาง deploy ที่ต้องมี header ชุดนี้ */
const HOSTING_CONFIGS = [
  "docker/30-render-security-headers.sh",
  "vercel.json",
  "scripts/setup-gcs-cdn.sh",
  "scripts/cloudfront-security-headers.sh",
] as const;

/** hash แบบที่ CSP ต้องการ: base64 ของ sha256 ของ "เนื้อใน" tag (ไม่รวมตัว tag เอง) */
function cspHashOfInlineScript(html: string): string {
  const match = /<script>(.*?)<\/script>/s.exec(html);
  if (!match) throw new Error("index.html has no inline <script> block");
  return `sha256-${createHash("sha256").update(match[1]).digest("base64")}`;
}

describe("security headers", () => {
  const expectedHash = cspHashOfInlineScript(read("index.html"));

  it.each(HOSTING_CONFIGS)(
    "%s มี script-src hash ที่ตรงกับ index.html",
    (file) => {
      expect(read(file)).toContain(expectedHash);
    },
  );

  // ชื่อ header ที่ห้ามหายไปจากปลายทางไหน — ค่าของแต่ละตัวต่างกันได้ตามปลายทาง
  // (เช่น connect-src ของ Docker เป็น same-origin แต่ของ CDN ต้องระบุ backend origin)
  // แต่ "มีหรือไม่มี" ต้องเหมือนกันหมด
  //
  // CloudFront ไม่ได้เขียนชื่อ header ตรง ๆ — policy JSON ใช้คีย์ของตัวเอง
  // (`ContentTypeOptions`, `FrameOptions`, …) จึงรับได้ทั้งสองสะกด
  it.each(HOSTING_CONFIGS)("%s ประกาศ header ครบทุกตัว", (file) => {
    const source = read(file);
    for (const header of [
      /Content-Security-Policy|ContentSecurityPolicy/,
      /X-Content-Type-Options|ContentTypeOptions/,
      /X-Frame-Options|FrameOptions/,
      /Referrer-Policy|ReferrerPolicy/,
      /Permissions-Policy/,
      /Strict-Transport-Security|StrictTransportSecurity/,
    ]) {
      expect(source).toMatch(header);
    }
  });

  it("CSP ไม่มี 'unsafe-inline' ใน script-src", () => {
    // style-src ต้องมี 'unsafe-inline' (React ใส่ style attribute + chart.tsx inject
    // <style>) แต่ script-src ห้ามมีเด็ดขาด ไม่งั้น CSP แทบไม่เหลือประโยชน์กับ XSS
    // ซึ่งเป็นเหตุผลหลักที่ใส่มันเข้ามาตั้งแต่แรก (refresh token อยู่ใน localStorage)
    for (const file of HOSTING_CONFIGS) {
      const scriptSrc = /script-src[^;"]*/.exec(read(file))?.[0] ?? "";
      expect(scriptSrc, file).not.toContain("unsafe-inline");
    }
  });
});
