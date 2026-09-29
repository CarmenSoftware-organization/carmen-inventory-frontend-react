import { describe, expect, it } from "vitest";
import {
  addDecimal,
  compareDecimal,
  multiplyDecimal,
  normalizeDecimal,
  percentOf,
  subtractDecimal,
} from "./ap-decimal";

describe("AP decimal arithmetic", () => {
  it("adds and subtracts canonical decimal strings exactly", () => {
    expect(addDecimal(["0.10", "0.20", "1000000000000.01"])).toBe(
      "1000000000000.31",
    );
    expect(subtractDecimal("107000.00", "3000.00")).toBe("104000.00");
  });

  it("rounds multiplication and tax consistently", () => {
    expect(multiplyDecimal("3", "33.335")).toBe("100.01");
    expect(percentOf("1000.00", "7")).toBe("70.00");
    expect(normalizeDecimal("1.005")).toBe("1.01");
    expect(compareDecimal("1.0", "1.00")).toBe(0);
  });
});
