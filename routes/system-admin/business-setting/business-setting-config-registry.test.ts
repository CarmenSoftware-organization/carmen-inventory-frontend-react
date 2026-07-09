import { describe, it, expect } from "vitest";
import {
  CONFIG_SECTIONS,
  SEEDED_ITEMS,
  SEEDED_KEYS,
  groupConfigForRender,
} from "./business-setting-config-registry";
import { mergeSeededConfig } from "./business-setting-form-schema";
import type { BusinessUnitConfigItem } from "@/types/business-unit";

describe("config registry", () => {
  it("SEEDED_ITEMS flattens every section's items", () => {
    const count = CONFIG_SECTIONS.reduce((n, s) => n + s.items.length, 0);
    expect(SEEDED_ITEMS).toHaveLength(count);
  });

  it("has no duplicate keys", () => {
    expect(SEEDED_KEYS.size).toBe(SEEDED_ITEMS.length);
  });

  it("registers pr.allow-duplicate.product as boolean defaulting to false", () => {
    const pr = SEEDED_ITEMS.find((i) => i.key === "pr.allow-duplicate.product");
    expect(pr).toBeDefined();
    expect(pr?.datatype).toBe("boolean");
    expect(pr?.defaultValue).toBe("false");
    expect(pr?.labelKey).toBe("config.prAllowDuplicateProduct");
  });

  it("puts the PR item under a section with id 'pr'", () => {
    const pr = CONFIG_SECTIONS.find((s) => s.id === "pr");
    expect(pr).toBeDefined();
    expect(pr?.items.some((i) => i.key === "pr.allow-duplicate.product")).toBe(
      true,
    );
  });
});

describe("groupConfigForRender", () => {
  it("puts the seeded PR item in the pr section with absolute index and labelKey", () => {
    const merged = mergeSeededConfig([]); // → [pr] at index 0
    const groups = groupConfigForRender(merged);
    expect(groups.sections).toHaveLength(1);
    expect(groups.sections[0].id).toBe("pr");
    expect(groups.sections[0].entries).toHaveLength(1);
    expect(groups.sections[0].entries[0].index).toBe(0);
    expect(groups.sections[0].entries[0].item.key).toBe(
      "pr.allow-duplicate.product",
    );
    expect(groups.sections[0].entries[0].labelKey).toBe(
      "config.prAllowDuplicateProduct",
    );
    expect(groups.other).toHaveLength(0);
  });

  it("keeps unknown backend items in 'other' and preserves absolute indices", () => {
    const backend: BusinessUnitConfigItem[] = [
      { key: "x.unknown", label: "X", datatype: "string", value: "1" },
    ];
    const merged = mergeSeededConfig(backend); // [x.unknown(0), pr(1)]
    const groups = groupConfigForRender(merged);
    expect(groups.other).toHaveLength(1);
    expect(groups.other[0].index).toBe(0);
    expect(groups.other[0].item.key).toBe("x.unknown");
    expect(groups.sections[0].entries[0].index).toBe(1);
  });

  it("omits a section when none of its items are present", () => {
    const groups = groupConfigForRender([]); // no items at all
    expect(groups.sections).toHaveLength(0);
    expect(groups.other).toHaveLength(0);
  });
});
