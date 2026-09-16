import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("permission-denied-icon.tsx — chrome stays flat and single-signal", () => {
  const src = readFileSync(
    join(import.meta.dirname, "permission-denied-icon.tsx"),
    "utf-8",
  );

  it("uses exactly one destructive signal — the icon", () => {
    const signals = src.match(/destructive/g) ?? [];
    expect(signals).toHaveLength(1);
    expect(src).toContain('className="text-destructive"');
  });

  it.each([
    ["gradients", /gradient/i],
    ["a keyframe/glow animation", /@keyframes|animation:/],
    ["a hardcoded rgba colour", /rgba\(/],
    ["an inline style block or attribute", /<style>|style=/],
    [
      "a status-coloured border",
      /border-(destructive|warning|success|info|positive|negative)/,
    ],
  ])("has no %s", (_label, pattern) => {
    expect(src).not.toMatch(pattern);
  });
});
