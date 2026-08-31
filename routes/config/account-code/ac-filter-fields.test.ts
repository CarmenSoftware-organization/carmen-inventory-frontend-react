import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import th from "@/messages/th.json";
import { AC_FILTER_FIELDS } from "./ac-filter-fields";
import { ACCOUNT_CODE_TYPES, ACCOUNT_NATURES } from "@/types/account-code";

const field = (key: string) => AC_FILTER_FIELDS.find((f) => f.key === key);
const optionsOf = (key: string) => {
  const f = field(key);
  return f && "options" in f && f.options ? f.options : [];
};

const lookup = (messages: unknown, path: string) =>
  path
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc as Record<string, unknown> | undefined)?.[part],
      messages,
    );

describe("AC_FILTER_FIELDS", () => {
  it("กรองได้สามอย่าง: สถานะ · ด้านบัญชี · ประเภท", () => {
    expect(AC_FILTER_FIELDS.map((f) => f.key)).toEqual([
      "filter",
      "nature",
      "type",
    ]);
  });

  it("ตัวเลือกครอบคลุมค่า enum ครบทุกตัว ไม่ตกไปสักค่า", () => {
    // enum เพิ่มค่าใหม่แล้วลืมใส่ในตัวกรอง = แถวนั้นหาไม่เจอตลอดกาล
    expect(optionsOf("nature").map((o) => o.value)).toEqual(
      ACCOUNT_NATURES.map((n) => `nature|string:${n}`),
    );
    expect(optionsOf("type").map((o) => o.value)).toEqual(
      ACCOUNT_CODE_TYPES.map((t) => `type|string:${t}`),
    );
  });

  it("ค่าที่เก็บเป็น clause เต็ม จึงไม่ต้องมี toClause", () => {
    // ListFilter ส่งค่าใน URL ไปเป็น filter param ตรง ๆ เมื่อไม่มี toClause —
    // ประกาศ toClause เพิ่มเมื่อไรจะได้ clause ซ้อน clause
    for (const f of AC_FILTER_FIELDS) {
      expect(f.toClause, f.key).toBeUndefined();
      for (const o of optionsOf(f.key)) {
        expect(o.value, o.labelKey).toMatch(/^[a-z_]+\|(string|bool):.+$/);
      }
    }
  });

  it("ทุก labelKey มีคำแปลทั้ง th และ en", () => {
    const keys = AC_FILTER_FIELDS.flatMap((f) => [
      f.labelKey,
      ...optionsOf(f.key).map((o) => o.labelKey),
    ]);
    const missing = keys.filter((k) => !lookup(th, k) || !lookup(en, k));
    expect(missing).toEqual([]);
  });
});
