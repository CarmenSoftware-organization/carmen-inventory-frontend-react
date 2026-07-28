import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cn } from "@/lib/utils";

/**
 * tailwind-merge รู้จัก scale มาตรฐานของ Tailwind กับ arbitrary value เท่านั้น
 * custom font-size ที่นิยามใน `@theme` มันไม่รู้จัก → ไม่ถือว่าขัดแย้งกับ
 * text-sm/text-xs แล้วเก็บไว้ทั้งคู่ ปล่อยให้ลำดับใน CSS ตัดสิน
 *
 * เคสจริง: AvatarFallback มี base `text-sm` แล้ว caller ส่ง `text-micro-legal`
 * เข้ามาทาง className → ได้ทั้งสอง class → text-sm ชนะ → ตัวย่อโตจาก 10px
 * เป็น 14px เงียบๆ ตอนยังเป็น `text-[0.625rem]` ไม่พัง เพราะ twMerge dedupe
 * arbitrary value ได้ถูก — พังตอนย้ายมาใช้ token ชื่อเฉพาะ
 *
 * tsc / build / unit test เดิมจับไม่ได้เลย เพราะมันถูกทุกอย่าง แค่ CSS
 * ลำดับสุดท้ายให้ผลผิด เลยต้องมีอันนี้
 */

/** บันไดที่ต้องลงทะเบียนไว้กับ twMerge — ต้องตรงกับ globals.css */
const LADDER = [
  "text-micro-floor",
  "text-micro-eyebrow",
  "text-micro-legal",
  "text-micro",
  "text-fine-print",
] as const;

describe("cn() merges the dense-ERP font-size ladder", () => {
  it("lets a ladder token override a built-in size", () => {
    for (const token of LADDER) {
      const out = cn("flex items-center text-sm", token);
      expect(out, `${token} should beat text-sm`).toContain(token);
      expect(out, `${token} should have dropped text-sm`).not.toMatch(
        /\btext-sm\b/,
      );
    }
  });

  it("lets a built-in size override a ladder token", () => {
    // direction matters too — last one wins, same as any other Tailwind conflict
    for (const token of LADDER) {
      const out = cn(token, "text-sm");
      expect(out, `text-sm should beat ${token}`).toMatch(/\btext-sm\b/);
      expect(out, `${token} should have been dropped`).not.toContain(token);
    }
  });

  it("treats two ladder tokens as conflicting with each other", () => {
    expect(cn("text-micro", "text-micro-legal")).toBe("text-micro-legal");
    expect(cn("text-micro-legal", "text-micro")).toBe("text-micro");
  });

  it("does not swallow a variant-prefixed size", () => {
    // md:text-xs is a legitimate responsive override, not a conflict
    const out = cn("text-micro md:text-xs");
    expect(out).toContain("text-micro");
    expect(out).toContain("md:text-xs");
  });

  it("keeps non-size text utilities alone", () => {
    const out = cn("text-micro text-muted-foreground text-right");
    expect(out).toContain("text-muted-foreground");
    expect(out).toContain("text-right");
  });

  it("registers every step that globals.css defines", () => {
    // the failure this catches: someone adds a --text-* step to the theme and
    // forgets lib/utils.ts, so the new step silently loses to text-sm forever
    const css = readFileSync(
      join(import.meta.dirname, "../../styles/globals.css"),
      "utf-8",
    );
    const defined = [...css.matchAll(/^\s*--text-([a-z-]+):\s*[\d.]+rem;/gm)]
      .map((m) => `text-${m[1]}`)
      .filter((c) => !LADDER.includes(c as (typeof LADDER)[number]));
    expect(defined, "unregistered --text-* steps in globals.css").toEqual([]);
  });
});
