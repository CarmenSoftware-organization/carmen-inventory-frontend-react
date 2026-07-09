import { describe, it, expect } from "vitest";
import {
  CONFIG_SECTIONS,
  SEEDED_ITEMS,
  SEEDED_KEYS,
} from "./business-setting-config-registry";

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
