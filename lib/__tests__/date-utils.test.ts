import { describe, it, expect } from "vitest";
import { formatDate, isoToDateInput } from "../date-utils";

describe("formatDate", () => {
  const iso = "2026-02-14T10:30:00Z";

  it("formats DD/MM/YYYY", () => {
    expect(formatDate(iso, "DD/MM/YYYY")).toBe("14/02/2026");
  });

  it("formats MM/DD/YYYY (US format)", () => {
    expect(formatDate(iso, "MM/DD/YYYY")).toBe("02/14/2026");
  });

  it("formats YYYY-MM-DD (ISO format)", () => {
    expect(formatDate(iso, "YYYY-MM-DD")).toBe("2026-02-14");
  });

  it("formats DD MMM YYYY (short month)", () => {
    expect(formatDate(iso, "DD MMM YYYY")).toBe("14 Feb 2026");
  });

  it("formats DD MMMM YYYY (full month)", () => {
    expect(formatDate(iso, "DD MMMM YYYY")).toBe("14 February 2026");
  });

  it("formats with lowercase tokens (dd/MM/yyyy)", () => {
    expect(formatDate(iso, "dd/MM/yyyy")).toBe("14/02/2026");
  });

  it("formats YY (2-digit year)", () => {
    expect(formatDate(iso, "DD/MM/YY")).toBe("14/02/26");
  });

  it("formats D and M (no padding)", () => {
    // Feb 14 → D=14, M=2
    expect(formatDate(iso, "D/M/YYYY")).toBe("14/2/2026");
  });

  it("pads single-digit day", () => {
    const singleDigitDay = "2026-03-05T00:00:00Z";
    expect(formatDate(singleDigitDay, "DD/MM/YYYY")).toBe("05/03/2026");
  });

  it("does not pad with D token", () => {
    const singleDigitDay = "2026-03-05T00:00:00Z";
    expect(formatDate(singleDigitDay, "D/M/YYYY")).toBe("5/3/2026");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDate("not-a-date", "DD/MM/YYYY")).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatDate("", "DD/MM/YYYY")).toBe("");
  });

  it("handles all 12 months correctly (MMM)", () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 12; i++) {
      const iso = `2026-${String(i + 1).padStart(2, "0")}-15T00:00:00Z`;
      expect(formatDate(iso, "MMM")).toBe(months[i]);
    }
  });
});

describe("isoToDateInput", () => {
  it("converts ISO to YYYY-MM-DD", () => {
    expect(isoToDateInput("2026-02-14T10:30:00Z")).toBe("2026-02-14");
  });

  it("handles date without time", () => {
    expect(isoToDateInput("2026-12-25T00:00:00.000Z")).toBe("2026-12-25");
  });

  it("returns empty string for invalid date", () => {
    expect(isoToDateInput("invalid")).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(isoToDateInput("")).toBe("");
  });
});
