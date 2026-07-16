import { describe, it, expect } from "vitest";
import { INTERFACES, findInterface } from "./interface-registry";

describe("interface registry", () => {
  it("registers the three v1 interfaces", () => {
    expect(INTERFACES.map((d) => d.key)).toEqual(["accounting", "pos", "pms"]);
  });

  it("has no duplicate route keys", () => {
    expect(new Set(INTERFACES.map((d) => d.key)).size).toBe(INTERFACES.length);
  });

  it("has no duplicate config keys", () => {
    expect(new Set(INTERFACES.map((d) => d.configKey)).size).toBe(
      INTERFACES.length,
    );
  });

  it("namespaces every config key under interface_", () => {
    for (const def of INTERFACES) {
      expect(def.configKey).toBe(`interface_${def.key}`);
    }
  });

  it("gives every interface an icon and a form", () => {
    for (const def of INTERFACES) {
      expect(def.icon).toBeDefined();
      expect(def.form).toBeDefined();
    }
  });
});

describe("findInterface", () => {
  it("resolves a known key", () => {
    expect(findInterface("pos")?.configKey).toBe("interface_pos");
  });

  it("returns undefined for an unknown key", () => {
    expect(findInterface("hms")).toBeUndefined();
  });

  it("returns undefined when the key is missing", () => {
    expect(findInterface(undefined)).toBeUndefined();
  });
});
