import { describe, it, expect } from "vitest";
import { interfaceEntitled } from "./use-interface-entitlement";

describe("interfaceEntitled", () => {
  it("hides every brand when the field is absent (platform selected none)", () => {
    expect(interfaceEntitled(undefined, "pos", "micros")).toBe(false);
    expect(interfaceEntitled(undefined, "accounting", "carmen_gl")).toBe(false);
  });

  it("allows nothing when the entitlement list is empty", () => {
    expect(interfaceEntitled([], "pos", "micros")).toBe(false);
  });

  it("allows only listed <category>_<brand> keys", () => {
    const enabled = ["pos_micros", "accounting_carmen_gl"];
    expect(interfaceEntitled(enabled, "pos", "micros")).toBe(true);
    expect(interfaceEntitled(enabled, "accounting", "carmen_gl")).toBe(true);
    expect(interfaceEntitled(enabled, "pos", "square")).toBe(false);
    expect(interfaceEntitled(enabled, "pms", "opera")).toBe(false);
  });

  it("does not match a brand key across the wrong category", () => {
    // "pos_micros" must not entitle a hypothetical pms brand named "micros"
    expect(interfaceEntitled(["pos_micros"], "pms", "micros")).toBe(false);
  });
});
