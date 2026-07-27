import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALES,
  FONT_SCALE_STORAGE_KEY,
  applyScale,
  readStoredScale,
  type FontScale,
} from "@/lib/font-scale";

/**
 * Guard สำหรับ font scale — ค่าของ feature นี้อยู่ 4 ที่ที่ไม่มีอะไรผูกกัน:
 * FONT_SCALES (TS) · rule ใน globals.css · array ใน inline script ของ index.html ·
 * key ใน messages/{en,th}.json คนที่เพิ่มระดับที่ 6 จะแก้ที่แรกแล้วลืมที่เหลือ
 * โดยไม่มีอะไรฟ้อง — test นี้อ่านไฟล์จริงจาก disk เพื่อฟ้องแทน
 */
const ROOT = join(import.meta.dirname, "../..");
const css = readFileSync(join(ROOT, "styles/globals.css"), "utf-8");
const indexHtml = readFileSync(join(ROOT, "index.html"), "utf-8");
const en = JSON.parse(
  readFileSync(join(ROOT, "messages/en.json"), "utf-8"),
) as { common: Record<string, string> };
const th = JSON.parse(
  readFileSync(join(ROOT, "messages/th.json"), "utf-8"),
) as { common: Record<string, string> };

/** `normal` ไม่มี class ของตัวเอง — ค่าของมันคือ rule `html` เปล่าใน @layer base */
function declaredPercent(scale: FontScale): number | null {
  const selector =
    scale === DEFAULT_FONT_SCALE
      ? String.raw`html`
      : String.raw`html\.font-scale-${scale}`;
  // `[^}]*?` กันไม่ให้ข้าม block — `html {` เปล่าจะไม่ match `html.font-scale-*`
  // เพราะ `\s*\{` ต้องตามหลัง selector ทันที
  const match = new RegExp(
    String.raw`^\s*${selector}\s*\{[^}]*?font-size:\s*([\d.]+)%`,
    "m",
  ).exec(css);
  return match ? Number(match[1]) : null;
}

describe("ladder ใน globals.css", () => {
  it("ประกาศ font-size ไว้ครบทุกระดับ", () => {
    for (const scale of FONT_SCALES) {
      expect(declaredPercent(scale), `ระดับ "${scale}"`).not.toBeNull();
    }
  });

  it("normal คือ 100% และไม่มี class .font-scale-normal", () => {
    expect(declaredPercent(DEFAULT_FONT_SCALE)).toBe(100);
    expect(css).not.toContain("font-scale-normal");
  });

  it("ค่าเรียงจากน้อยไปมากตามลำดับ FONT_SCALES", () => {
    const values = FONT_SCALES.map(declaredPercent);
    expect(values).toEqual([...values].sort((a, b) => Number(a) - Number(b)));
  });

  it("print reset ขนาดกลับเป็น 100%", () => {
    // งานพิมพ์ต้องไม่ขึ้นกับ preference บนจอ — assert เฉพาะใน block @media print
    // เพราะ `html` base ก็เป็น 100% เหมือนกัน
    const printBlock = css.slice(css.indexOf("@media print"));
    expect(printBlock).toContain("@media print");
    expect(printBlock).toMatch(/font-size:\s*100%\s*!important/);
  });
});

describe("boot script ใน index.html", () => {
  it("ใช้ storage key เดียวกับ lib/font-scale.ts", () => {
    expect(indexHtml).toContain(FONT_SCALE_STORAGE_KEY);
  });

  it("รายชื่อระดับตรงกับ FONT_SCALES (ยกเว้น normal ที่ไม่มี class)", () => {
    const match = /\[([^\]]*)\]\s*\.indexOf\(s\)/.exec(indexHtml);
    expect(match, "ไม่พบ array ของระดับใน inline script").not.toBeNull();
    const inScript = match![1]
      .split(",")
      .map((raw) => raw.trim().replace(/["']/g, ""))
      .filter(Boolean);
    expect(inScript).toEqual(
      FONT_SCALES.filter((scale) => scale !== DEFAULT_FONT_SCALE),
    );
  });
});

describe("readStoredScale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("คืน default เมื่อยังไม่เคยตั้งค่า", () => {
    expect(readStoredScale()).toBe(DEFAULT_FONT_SCALE);
  });

  it("คืนค่าที่เก็บไว้ (round-trip กับ applyScale)", () => {
    applyScale("bigger");
    expect(readStoredScale()).toBe("bigger");
  });

  it("คืน default เมื่อค่าที่เก็บไว้เสียหาย", () => {
    for (const broken of ["huge", "", "NORMAL", "1"]) {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, broken);
      expect(readStoredScale(), `ค่า "${broken}"`).toBe(DEFAULT_FONT_SCALE);
    }
  });
});

describe("applyScale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("เติม class ของระดับที่เลือกตัวเดียว", () => {
    applyScale("biggest");
    expect(document.documentElement.className).toBe("font-scale-biggest");
  });

  it("สลับระดับแล้วไม่เหลือ class เก่าค้าง", () => {
    applyScale("small");
    applyScale("big");
    expect(document.documentElement.className).toBe("font-scale-big");
  });

  it("normal ลบ class ทิ้งหมด", () => {
    applyScale("bigger");
    applyScale(DEFAULT_FONT_SCALE);
    expect(document.documentElement.className).toBe("");
  });

  it("ไม่แตะ class อื่นบน <html> เช่น dark ของ next-themes", () => {
    document.documentElement.classList.add("dark");
    applyScale("big");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyScale(DEFAULT_FONT_SCALE);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("i18n", () => {
  const labelKey = (scale: FontScale) =>
    `fontSize${scale.charAt(0).toUpperCase()}${scale.slice(1)}`;

  it("มี label ครบทุกระดับทั้ง en และ th", () => {
    for (const scale of FONT_SCALES) {
      const key = labelKey(scale);
      expect(en.common[key], `en.common.${key}`).toBeTruthy();
      expect(th.common[key], `th.common.${key}`).toBeTruthy();
    }
  });

  it("มี label ของหัวข้อเมนูทั้งสองภาษา", () => {
    expect(en.common.fontSize).toBeTruthy();
    expect(th.common.fontSize).toBeTruthy();
  });
});
