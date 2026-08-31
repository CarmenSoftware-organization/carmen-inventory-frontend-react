import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `permission-denied-icon.tsx` was split out of `permission-denied-dialog.tsx`
 * (see the comment at the top of that file) specifically to avoid a conflict
 * with `permission-denied-dialog.test.tsx`'s "chrome stays flat and
 * single-signal" describe block — that block reads only `permission-denied-
 * dialog.tsx`'s source, so once the license/expired icon moved into its own
 * file it stopped guarding this one. This file re-applies the exact same
 * guard here so the "license"/"expired" render paths stay covered too.
 *
 * docs/DESIGN.md: "error state = red icon only; neutral box, muted label,
 * neutral border" — the dialog this icon renders inside of once carried nine
 * destructive signals (tinted border, gradients, glow, chip fill/border/dot)
 * before being reduced to exactly one (the icon). Nothing should reintroduce
 * that here either.
 */
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
