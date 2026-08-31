import { describe, expect, it } from "vitest";
import { redactCapabilityTokens } from "@/lib/telemetry";

/**
 * ลิงก์ price-list ที่ส่งให้ vendor ไม่มี login — ตัว token ใน path **คือ** สิทธิ์เข้าถึง
 * ทั้งหมดของลิงก์นั้น ทุก path ที่ถือ token ต้องถูกล้างก่อนขึ้น SigNoz เสมอ
 */
describe("redactCapabilityTokens", () => {
  it.each([
    ["/pl/abc123", "/pl/<token>"],
    [
      "/api/external/api/pricelist-external/tok-1",
      "/api/external/api/pricelist-external/<token>",
    ],
    [
      "https://api.example.com/api/check-pricelist/tok-2/tax-profiles",
      "https://api.example.com/api/check-pricelist/<token>/tax-profiles",
    ],
    // query/hash ไม่ใช่ส่วนของ token — ตัดที่ขอบ segment เท่านั้น
    ["/pl/tok-3?lang=th", "/pl/<token>?lang=th"],
  ])("%s → %s", (input, expected) => {
    expect(redactCapabilityTokens(input)).toBe(expected);
  });

  it("ไม่แตะ path ที่ไม่มี token", () => {
    for (const path of [
      "/dashboard",
      "/procurement/purchase-request/123",
      "/api/proxy/vendors",
    ]) {
      expect(redactCapabilityTokens(path)).toBe(path);
    }
  });

  it("ล้างครบทุก segment เมื่อมีมากกว่าหนึ่งที่ใน URL เดียว", () => {
    expect(redactCapabilityTokens("/pl/a/x/check-pricelist/b")).toBe(
      "/pl/<token>/x/check-pricelist/<token>",
    );
  });
});
