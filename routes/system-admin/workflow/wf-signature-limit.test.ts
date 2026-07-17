import { describe, it, expect } from "vitest";
import {
  MAX_SIGNATURES,
  countSignatureStages,
  isSignatureCheckboxDisabled,
} from "./wf-signature-limit";

const stages = (...flags: (boolean | undefined)[]) =>
  flags.map((is_show_signature) => ({ is_show_signature }));

describe("countSignatureStages", () => {
  it("นับเฉพาะ stage ที่ติ๊ก", () => {
    expect(countSignatureStages(stages(true, false, true))).toBe(2);
  });

  it("ถือ undefined เป็นไม่ติ๊ก", () => {
    expect(countSignatureStages(stages(undefined, undefined))).toBe(0);
  });

  it("คืน 0 เมื่อไม่มี stage", () => {
    expect(countSignatureStages([])).toBe(0);
  });
});

describe("isSignatureCheckboxDisabled", () => {
  it("ยังไม่ครบ 5 — ติ๊กเพิ่มได้", () => {
    expect(isSignatureCheckboxDisabled(stages(true, false), 1)).toBe(false);
  });

  it("ครบ 5 แล้ว — stage ที่ยังไม่ติ๊กถูก disable", () => {
    const s = stages(true, true, true, true, true, false);
    expect(isSignatureCheckboxDisabled(s, 5)).toBe(true);
  });

  it("ครบ 5 แล้ว — stage ที่ติ๊กแล้วยังปลดได้", () => {
    const s = stages(true, true, true, true, true, false);
    expect(isSignatureCheckboxDisabled(s, 0)).toBe(false);
  });

  it("index เกินขอบเขต — ไม่ throw และไม่ disable", () => {
    expect(isSignatureCheckboxDisabled(stages(true), 9)).toBe(false);
  });

  it("MAX_SIGNATURES เท่ากับ 5", () => {
    expect(MAX_SIGNATURES).toBe(5);
  });
});
