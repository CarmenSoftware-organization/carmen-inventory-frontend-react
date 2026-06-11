import { describe, it, expect } from "vitest";
import { formatCurrency, formatExchangeRate } from "../currency-utils";

describe("formatCurrency", () => {
  it("formats with 2 decimal places by default", () => {
    const result = formatCurrency(1234.5);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("50");
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0[.,]00/);
  });

  it("respects custom decimal places", () => {
    const result = formatCurrency(1234.5678, 4);
    expect(result).toContain("5678");
  });

  it("formats negative numbers", () => {
    const result = formatCurrency(-500);
    expect(result).toContain("500");
  });

  it("pads decimals when value is integer", () => {
    const result = formatCurrency(100, 2);
    expect(result).toMatch(/100[.,]00/);
  });

  it("handles 0 decimal places", () => {
    const result = formatCurrency(1234.56, 0);
    expect(result).toContain("1");
    expect(result).not.toContain(".");
  });
});

describe("formatExchangeRate", () => {
  it("returns '-' for null rate", () => {
    expect(formatExchangeRate(null)).toBe("-");
  });

  it("returns '-' for undefined rate", () => {
    expect(formatExchangeRate(undefined)).toBe("-");
  });

  it("returns '-' for zero rate", () => {
    expect(formatExchangeRate(0)).toBe("-");
  });

  it("formats rate as-is without inversion", () => {
    const result = formatExchangeRate(35.71428);
    expect(result).toContain("35");
    expect(result).toMatch(/71428/);
  });

  it("appends currency code when provided", () => {
    const result = formatExchangeRate(35.71428, "THB");
    expect(result).toContain("THB");
  });

  it("does not append currency code when null", () => {
    const result = formatExchangeRate(35.71428, null);
    expect(result).not.toContain("null");
  });

  it("always uses 5 decimal places", () => {
    const result = formatExchangeRate(1);
    expect(result).toMatch(/1[.,]00000/);
  });
});
