import { describe, it, expect } from "vitest";
import { pickDocVersion } from "./doc-version";

describe("pickDocVersion — ลำดับความสด", () => {
  it("มีค่าสดจาก DB → ใช้อันนั้น แม้ฟอร์มกับ record จะมีค่าอื่น", () => {
    expect(pickDocVersion(5, 2, 1)).toBe(5);
  });

  it("GET ไม่ได้ค่ามา → ตกไปใช้ค่าในฟอร์ม (sync ไว้หลัง save รอบก่อน)", () => {
    expect(pickDocVersion(null, 2, 1)).toBe(2);
    expect(pickDocVersion(undefined, 2, 1)).toBe(2);
  });

  it("ฟอร์มก็ไม่มี → ตกไปใช้ค่าตอนโหลดหน้า", () => {
    expect(pickDocVersion(null, null, 1)).toBe(1);
    expect(pickDocVersion(undefined, undefined, 1)).toBe(1);
  });

  it("ไม่มีเลยสักชั้น → 0", () => {
    expect(pickDocVersion(null, null, null)).toBe(0);
    expect(pickDocVersion(undefined)).toBe(0);
  });

  it("0 คือค่าที่ถูกต้อง ไม่ใช่ 'ไม่มีค่า' — ห้ามตกไปชั้นถัดไป", () => {
    // ใช้ || แทน ?? เมื่อไหร่ เคสนี้จะคืน 7 ซึ่งคือส่ง version ผิดไปให้ backend
    expect(pickDocVersion(0, 7, 9)).toBe(0);
    expect(pickDocVersion(null, 0, 9)).toBe(0);
    expect(pickDocVersion(null, null, 0)).toBe(0);
  });
});
