import { describe, it, expect } from "vitest";
import {
  arrayToText,
  textToArray,
  objectToText,
  textToObject,
  createKeyValueRow,
  objectToKeyValues,
  keyValuesToObject,
  buildItemChanges,
} from "../form-helpers";

// ─── arrayToText / textToArray ───────────────────────────────────────────────

describe("arrayToText", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(arrayToText(null)).toBe("");
    expect(arrayToText(undefined)).toBe("");
    expect(arrayToText([])).toBe("");
  });

  it("joins items with newline", () => {
    expect(arrayToText(["a", "b", "c"])).toBe("a\nb\nc");
  });
});

describe("textToArray", () => {
  it("returns null for empty/whitespace-only string", () => {
    expect(textToArray("")).toBeNull();
    expect(textToArray("   \n  \n  ")).toBeNull();
  });

  it("splits by newline, trims, and filters empty lines", () => {
    expect(textToArray("a\n  b \n\nc")).toEqual(["a", "b", "c"]);
  });
});

// ─── objectToText / textToObject ─────────────────────────────────────────────

describe("objectToText", () => {
  it("returns empty string for null/undefined/empty object", () => {
    expect(objectToText(null)).toBe("");
    expect(objectToText(undefined)).toBe("");
    expect(objectToText({})).toBe("");
  });

  it("returns formatted JSON", () => {
    expect(objectToText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe("textToObject", () => {
  it("returns null for empty/whitespace string", () => {
    expect(textToObject("")).toBeNull();
    expect(textToObject("   ")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(textToObject("{invalid}")).toBeNull();
  });

  it("parses valid JSON", () => {
    expect(textToObject('{"a":1}')).toEqual({ a: 1 });
  });
});

// ─── Key-value helpers ───────────────────────────────────────────────────────

describe("createKeyValueRow", () => {
  it("creates row with unique _id", () => {
    const r1 = createKeyValueRow("k", "v");
    const r2 = createKeyValueRow();
    expect(r1.key).toBe("k");
    expect(r1.value).toBe("v");
    expect(r2.key).toBe("");
    expect(r2.value).toBe("");
    expect(r1._id).not.toBe(r2._id);
  });
});

describe("objectToKeyValues", () => {
  it("returns empty array for null/undefined/empty", () => {
    expect(objectToKeyValues(null)).toEqual([]);
    expect(objectToKeyValues(undefined)).toEqual([]);
    expect(objectToKeyValues({})).toEqual([]);
  });

  it("converts object entries to rows", () => {
    const rows = objectToKeyValues({ name: "Alice", age: 30 });
    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe("name");
    expect(rows[0].value).toBe("Alice");
    expect(rows[1].key).toBe("age");
    expect(rows[1].value).toBe("30");
  });

  it("converts null value to empty string", () => {
    const rows = objectToKeyValues({ x: null });
    expect(rows[0].value).toBe("");
  });
});

describe("keyValuesToObject", () => {
  it("returns null when no keys have content", () => {
    expect(keyValuesToObject([])).toBeNull();
    expect(
      keyValuesToObject([createKeyValueRow("", "v")]),
    ).toBeNull();
  });

  it("converts numeric string values to numbers", () => {
    const result = keyValuesToObject([createKeyValueRow("qty", "42")]);
    expect(result).toEqual({ qty: 42 });
  });

  it("converts boolean string values", () => {
    const result = keyValuesToObject([
      createKeyValueRow("a", "true"),
      createKeyValueRow("b", "false"),
    ]);
    expect(result).toEqual({ a: true, b: false });
  });

  it("keeps non-numeric strings as-is", () => {
    const result = keyValuesToObject([createKeyValueRow("name", "hello")]);
    expect(result).toEqual({ name: "hello" });
  });

  it("treats empty value as empty string", () => {
    const result = keyValuesToObject([createKeyValueRow("k", "")]);
    expect(result).toEqual({ k: "" });
  });
});

// ─── buildItemChanges ────────────────────────────────────────────────────────

interface TestItem {
  id?: string | null;
  name: string;
  qty: number;
}

interface TestPayload {
  name: string;
  qty: number;
}

const mapFn = (item: TestItem): TestPayload => ({
  name: item.name,
  qty: item.qty,
});

describe("buildItemChanges", () => {
  it("returns empty object when nothing changed", () => {
    const items: TestItem[] = [{ id: "1", name: "A", qty: 1 }];
    const defaults: TestItem[] = [{ id: "1", name: "A", qty: 1 }];
    const dirty = [{}]; // no dirty fields

    const result = buildItemChanges(items, defaults, dirty, mapFn);
    expect(result).toEqual({});
  });

  it("detects new items (no id)", () => {
    const items: TestItem[] = [
      { id: "1", name: "A", qty: 1 },
      { name: "B", qty: 2 },
      { id: null, name: "C", qty: 3 },
    ];
    const defaults: TestItem[] = [{ id: "1", name: "A", qty: 1 }];
    const dirty = [{}];

    const result = buildItemChanges(items, defaults, dirty, mapFn);
    expect(result.add).toEqual([
      { name: "B", qty: 2 },
      { name: "C", qty: 3 },
    ]);
    expect(result.update).toBeUndefined();
    expect(result.remove).toBeUndefined();
  });

  it("detects removed items (in defaults but not in current)", () => {
    const items: TestItem[] = [{ id: "1", name: "A", qty: 1 }];
    const defaults: TestItem[] = [
      { id: "1", name: "A", qty: 1 },
      { id: "2", name: "B", qty: 2 },
      { id: "3", name: "C", qty: 3 },
    ];

    const result = buildItemChanges(items, defaults, [{}], mapFn);
    expect(result.remove).toEqual([{ id: "2" }, { id: "3" }]);
    expect(result.add).toBeUndefined();
  });

  it("detects updated items via dirtyFields", () => {
    const items: TestItem[] = [
      { id: "1", name: "A-updated", qty: 1 },
      { id: "2", name: "B", qty: 2 },
    ];
    const defaults: TestItem[] = [
      { id: "1", name: "A", qty: 1 },
      { id: "2", name: "B", qty: 2 },
    ];
    // Only first item is dirty
    const dirty = [{ name: true }, {}];

    const result = buildItemChanges(items, defaults, dirty, mapFn);
    expect(result.update).toEqual([
      { id: "1", name: "A-updated", qty: 1 },
    ]);
    expect(result.add).toBeUndefined();
    expect(result.remove).toBeUndefined();
  });

  it("falls back to shallow compare when dirtyFields is undefined", () => {
    const items: TestItem[] = [
      { id: "1", name: "A-changed", qty: 1 },
      { id: "2", name: "B", qty: 2 },
    ];
    const defaults: TestItem[] = [
      { id: "1", name: "A", qty: 1 },
      { id: "2", name: "B", qty: 2 },
    ];

    const result = buildItemChanges(items, defaults, undefined, mapFn);
    expect(result.update).toEqual([
      { id: "1", name: "A-changed", qty: 1 },
    ]);
  });

  it("treats existing item not in defaults as updated (fallback)", () => {
    const items: TestItem[] = [{ id: "99", name: "new-existing", qty: 5 }];
    const defaults: TestItem[] = [];

    const result = buildItemChanges(items, defaults, undefined, mapFn);
    expect(result.update).toEqual([
      { id: "99", name: "new-existing", qty: 5 },
    ]);
  });

  it("handles mixed add + update + remove in one call", () => {
    const items: TestItem[] = [
      { id: "1", name: "A-updated", qty: 10 }, // updated
      // id "2" removed
      { name: "D", qty: 4 }, // added
    ];
    const defaults: TestItem[] = [
      { id: "1", name: "A", qty: 1 },
      { id: "2", name: "B", qty: 2 },
    ];
    const dirty = [{ name: true, qty: true }];

    const result = buildItemChanges(items, defaults, dirty, mapFn);

    expect(result.add).toEqual([{ name: "D", qty: 4 }]);
    expect(result.update).toEqual([{ id: "1", name: "A-updated", qty: 10 }]);
    expect(result.remove).toEqual([{ id: "2" }]);
  });

  it("returns empty object when all items are unchanged", () => {
    const items: TestItem[] = [
      { id: "1", name: "A", qty: 1 },
      { id: "2", name: "B", qty: 2 },
    ];

    const result = buildItemChanges(items, items, [{}, {}], mapFn);
    expect(result).toEqual({});
  });

  it("handles empty arrays", () => {
    const result = buildItemChanges<TestItem, TestPayload>([], [], undefined, mapFn);
    expect(result).toEqual({});
  });

  it("handles all items removed", () => {
    const defaults: TestItem[] = [
      { id: "1", name: "A", qty: 1 },
      { id: "2", name: "B", qty: 2 },
    ];

    const result = buildItemChanges([], defaults, undefined, mapFn);
    expect(result.remove).toEqual([{ id: "1" }, { id: "2" }]);
    expect(result.add).toBeUndefined();
    expect(result.update).toBeUndefined();
  });

  it("handles all items are new", () => {
    const items: TestItem[] = [
      { name: "X", qty: 1 },
      { name: "Y", qty: 2 },
    ];

    const result = buildItemChanges(items, [], undefined, mapFn);
    expect(result.add).toEqual([
      { name: "X", qty: 1 },
      { name: "Y", qty: 2 },
    ]);
    expect(result.update).toBeUndefined();
    expect(result.remove).toBeUndefined();
  });
});
