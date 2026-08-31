import { describe, expect, it } from "vitest";
import {
  parseConfig,
  previewCode,
  serializeConfig,
  slotName,
  type CodePart,
} from "./running-code-config";

/** 2026-08-27 — ตรึงไว้ให้ตัวอย่างวันที่คงที่ ไม่ใช่ new Date() ที่พังเดือนหน้า */
const NOW = new Date(2026, 7, 27);

describe("parseConfig", () => {
  it("อ่าน config จริงของ GRN ออกเป็นสามส่วน", () => {
    expect(
      parseConfig({
        A: "GRN",
        B: "date('yyMM')",
        C: "running(5, '0')",
        format: "{A}{B}{C}",
      }),
    ).toEqual({
      parts: [
        { kind: "text", text: "GRN" },
        { kind: "date", pattern: "yyMM" },
        { kind: "running", digits: 5, pad: "0" },
      ],
      extra: {},
    });
  });

  it("อ่าน token ที่เป็นค่าจากข้อมูลได้", () => {
    const parsed = parseConfig({
      A: "{PRODUCT-SUB-CAT}",
      B: "running(2, '0')",
      format: "{A}{B}",
    });
    expect(parsed?.parts[0]).toEqual({
      kind: "token",
      token: "PRODUCT-SUB-CAT",
    });
  });

  it("เก็บคีย์ที่ไม่ได้อยู่ใน format ไว้ใน extra", () => {
    const parsed = parseConfig({
      A: "PR",
      format: "{A}",
      reset_period: "month",
    });
    expect(parsed?.extra).toEqual({ reset_period: "month" });
  });

  it("คืน null เมื่ออ่านไม่ออก — ผู้เรียกต้องถอยไปโหมด JSON", () => {
    expect(parseConfig({ A: "PR" })).toBeNull(); // ไม่มี format
    expect(parseConfig({ format: "{A}" })).toBeNull(); // อ้างช่องที่ไม่มี
    expect(parseConfig({ format: "PR-FIXED" })).toBeNull(); // ไม่มีช่องเลย
  });

  it("config ว่างเปล่า = เริ่มจากศูนย์ ไม่ใช่พัง", () => {
    expect(parseConfig({})).toEqual({ parts: [], extra: {} });
    expect(parseConfig(undefined)).toEqual({ parts: [], extra: {} });
  });
});

describe("serializeConfig", () => {
  it("ประกอบกลับได้เหมือนของเดิม (round-trip)", () => {
    const original = {
      A: "GRN",
      B: "date('yyMM')",
      C: "running(5, '0')",
      format: "{A}{B}{C}",
    };
    const parsed = parseConfig(original);
    expect(serializeConfig(parsed!.parts, parsed!.extra)).toEqual(original);
  });

  it("ไล่ชื่อช่องใหม่ตามลำดับ ไม่สนชื่อเดิม", () => {
    const parts: CodePart[] = [
      { kind: "text", text: "PR" },
      { kind: "running", digits: 4, pad: "0" },
    ];
    expect(serializeConfig(parts)).toEqual({
      A: "PR",
      B: "running(4, '0')",
      format: "{A}{B}",
    });
  });

  it("คีย์ที่ไม่รู้จักต้องไม่หายไปตอนบันทึก", () => {
    const out = serializeConfig([{ kind: "text", text: "PR" }], {
      reset_period: "month",
    });
    expect(out.reset_period).toBe("month");
  });

  it("คีย์เก่าที่ชื่อชนกับช่องใหม่ ต้องไม่ทับของใหม่", () => {
    const out = serializeConfig([{ kind: "text", text: "NEW" }], { A: "OLD" });
    expect(out.A).toBe("NEW");
  });
});

describe("previewCode", () => {
  it("ตัวอย่างของ GRN ตรงกับเลขจริงที่คนเห็นบนใบ", () => {
    const parts = parseConfig({
      A: "GRN",
      B: "date('yyMM')",
      C: "running(5, '0')",
      format: "{A}{B}{C}",
    })!.parts;
    expect(previewCode(parts, NOW)).toBe("GRN260800001");
  });

  it("เลขลำดับเติมหน้าตามจำนวนหลักที่ตั้ง", () => {
    expect(
      previewCode([{ kind: "running", digits: 4, pad: "0" }], NOW, 12),
    ).toBe("0012");
  });

  it("token โชว์ชื่อค่าไว้ ไม่ใช่ปล่อยว่าง", () => {
    expect(previewCode([{ kind: "token", token: "PRODUCT-SUB-CAT" }], NOW)).toBe(
      "‹PRODUCT-SUB-CAT›",
    );
  });

  it("รูปแบบวันที่ที่ไม่รู้จัก ไม่ทำให้ตัวอย่างหายทั้งบรรทัด", () => {
    const parts: CodePart[] = [
      { kind: "text", text: "X" },
      { kind: "date", pattern: "ไม่ใช่รูปแบบ" },
    ];
    expect(previewCode(parts, NOW).startsWith("X")).toBe(true);
  });
});

describe("slotName", () => {
  it("ไล่ A..Z แล้วต่อด้วย AA", () => {
    expect(slotName(0)).toBe("A");
    expect(slotName(25)).toBe("Z");
    expect(slotName(26)).toBe("AA");
  });
});
