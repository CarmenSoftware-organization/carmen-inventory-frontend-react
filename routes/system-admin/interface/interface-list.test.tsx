import { describe, it, expect } from "vitest";
import { interfaceStatuses } from "./interface-list";
import { INTERFACES } from "./interface-registry";
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

describe("interfaceStatuses", () => {
  it("marks an interface enabled when its config says so", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("interface_pos", { enabled: true }),
    ]);
    expect(rows.find((r) => r.def.key === "pos")?.enabled).toBe(true);
  });

  it("marks an interface disabled when it has no config row", () => {
    const rows = interfaceStatuses(INTERFACES, []);
    expect(rows.every((r) => r.enabled === false)).toBe(true);
  });

  it("marks an interface disabled when enabled is false", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("interface_pms", { enabled: false }),
    ]);
    expect(rows.find((r) => r.def.key === "pms")?.enabled).toBe(false);
  });

  it("treats a non-boolean enabled as disabled", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("interface_pos", { enabled: "yes" }),
    ]);
    expect(rows.find((r) => r.def.key === "pos")?.enabled).toBe(false);
  });

  it("ignores app configs that are not interfaces", () => {
    const rows = interfaceStatuses(INTERFACES, [
      config("report_email", { enabled: true }),
    ]);
    expect(rows).toHaveLength(INTERFACES.length);
    expect(rows.every((r) => r.enabled === false)).toBe(true);
  });

  it("returns one row per registered interface, in registry order", () => {
    const rows = interfaceStatuses(INTERFACES, []);
    expect(rows.map((r) => r.def.key)).toEqual(["accounting", "pos", "pms"]);
  });
});
