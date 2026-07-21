import { describe, it, expect } from "vitest";
import { interfaceGroups } from "./interface-list";
import { INTERFACE_CATEGORIES } from "./interface-registry";
import { interfaceEntitled } from "@/hooks/use-interface-entitlement";
import type { AppConfig } from "@/types/app-config";

function config(key: string, value: Record<string, unknown>): AppConfig {
  return {
    id: key,
    key,
    value,
    created_at: null,
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  };
}

/** show every brand — mirrors an older gateway with no entitlement field */
const allowAll = () => true;

describe("interfaceGroups", () => {
  it("marks a brand enabled when its config row says so", () => {
    const groups = interfaceGroups(
      INTERFACE_CATEGORIES,
      [config("interface_pos_micros", { enabled: true })],
      allowAll,
    );
    const pos = groups.find((g) => g.category.key === "pos");
    expect(pos?.brands.find((b) => b.brand.key === "micros")?.enabled).toBe(
      true,
    );
    expect(pos?.brands.find((b) => b.brand.key === "square")?.enabled).toBe(
      false,
    );
  });

  it("marks a brand disabled when it has no config row", () => {
    const groups = interfaceGroups(INTERFACE_CATEGORIES, [], allowAll);
    expect(groups.every((g) => g.brands.every((b) => !b.enabled))).toBe(true);
  });

  it("treats a non-boolean enabled as disabled", () => {
    const groups = interfaceGroups(
      INTERFACE_CATEGORIES,
      [config("interface_pos_micros", { enabled: "yes" })],
      allowAll,
    );
    const micros = groups
      .find((g) => g.category.key === "pos")
      ?.brands.find((b) => b.brand.key === "micros");
    expect(micros?.enabled).toBe(false);
  });

  it("ignores app configs that are not interface brands", () => {
    const groups = interfaceGroups(
      INTERFACE_CATEGORIES,
      [config("report_email", { enabled: true })],
      allowAll,
    );
    expect(groups.every((g) => g.brands.every((b) => !b.enabled))).toBe(true);
  });

  it("filters brands by entitlement and drops empty categories", () => {
    const enabled = ["pos_micros", "pos_square"];
    const groups = interfaceGroups(INTERFACE_CATEGORIES, [], (c, b) =>
      interfaceEntitled(enabled, c, b),
    );
    // only POS survives; accounting + pms have no entitled brand
    expect(groups.map((g) => g.category.key)).toEqual(["pos"]);
    expect(groups[0].brands.map((b) => b.brand.key)).toEqual([
      "micros",
      "square",
    ]);
  });

  it("returns categories in registry order when all are entitled", () => {
    const groups = interfaceGroups(INTERFACE_CATEGORIES, [], allowAll);
    expect(groups.map((g) => g.category.key)).toEqual([
      "accounting",
      "pos",
      "pms",
    ]);
  });

  it("returns no groups when nothing is entitled", () => {
    const groups = interfaceGroups(INTERFACE_CATEGORIES, [], () => false);
    expect(groups).toHaveLength(0);
  });
});
