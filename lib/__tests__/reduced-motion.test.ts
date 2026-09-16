import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = join(import.meta.dirname, "../..");
const css = readFileSync(join(ROOT, "styles/globals.css"), "utf-8");

function reducedMotionBlock(): string {
  const start = css.search(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/,
  );
  if (start === -1) return "";
  let depth = 0;
  let i = css.indexOf("{", start);
  const from = i;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) break;
  }
  return css.slice(from, i);
}

describe("reduced motion is honoured", () => {
  const block = reducedMotionBlock();

  it("has a prefers-reduced-motion block at all", () => {
    expect(
      block,
      "no @media (prefers-reduced-motion: reduce) in globals.css",
    ).not.toBe("");
  });

  it("neutralises animation and transition globally", () => {
    for (const prop of [
      "animation-duration",
      "animation-iteration-count",
      "transition-duration",
    ]) {
      expect(block, `${prop} not neutralised`).toMatch(
        new RegExp(`${prop}:\\s*[^;]*!important`),
      );
    }
  });

  it("keeps the loading spinner and the skeleton running", () => {
    // a frozen spinner reads as a hung request — these two report state, so the
    // blanket rule must not apply to them
    for (const cls of ["animate-spin", "animate-pulse"]) {
      expect(block, `.${cls} is not exempted — it would freeze`).toMatch(
        new RegExp(`\\.${cls}\\s*\\{[^}]*animation:[^}]*!important`),
      );
    }
  });

  it("does not exempt decorative motion", () => {
    // pulse-soft is empty-state SVG decoration, ping is a redundant "you are
    // here" amplifier, float is unused. None of them carry information.
    for (const cls of ["animate-pulse-soft", "animate-ping", "animate-float"]) {
      expect(block, `.${cls} should not be exempted`).not.toMatch(
        new RegExp(`\\.${cls}\\s*\\{`),
      );
    }
  });

  it("still finds the pattern it guards", () => {
    // if the block-extractor silently stopped matching, every assertion above
    // would pass against an empty string
    expect(block.length).toBeGreaterThan(100);
    expect(block).toContain("!important");
  });
});
