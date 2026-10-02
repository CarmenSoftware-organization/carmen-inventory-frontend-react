import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// คีย์ที่มีภาษาเดียว = อีกภาษาเห็นคีย์ดิบบนหน้าจอ (use-intl ไม่ fallback ข้ามภาษา)
// และ tsc จับไม่ได้ — #226 เจอสามจุดจากการเปิดหน้าดูด้วยตาเท่านั้น

const ROOT = join(import.meta.dirname, "../..");

type Messages = { [key: string]: string | Messages };

function load(locale: string): Messages {
  return JSON.parse(
    readFileSync(join(ROOT, `messages/${locale}.json`), "utf-8"),
  ) as Messages;
}

/** ทุก path ของใบไม้ เช่น `inventoryManagement.physicalCount.nItems` */
function leafPaths(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : leafPaths(value, path);
  });
}

describe("messages en/th key parity", () => {
  const en = new Set(leafPaths(load("en")));
  const th = new Set(leafPaths(load("th")));

  it("every en key exists in th", () => {
    expect([...en].filter((k) => !th.has(k))).toEqual([]);
  });

  it("every th key exists in en", () => {
    expect([...th].filter((k) => !en.has(k))).toEqual([]);
  });
});
