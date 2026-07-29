import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * docs/DESIGN.md: "Don't introduce a second accent color; every 'click me'
 * signal is {colors.primary}" — "No second brand color exists."
 *
 * These pages used to thread a 5-hue `TONE_COLOR` map (indigo / blue / green /
 * rose / orange) through the card chrome and all twelve module visuals, using
 * colour to encode which category a module belonged to. That is four extra
 * accents. The same violation was settled once already in the role module and
 * grew back here, so it is worth a guard rather than a third sweep.
 *
 * Semantic colours are fine elsewhere — a badge really is "warning". They have
 * no meaning on a catalog page, which is why this is scoped to landing-*.
 */
const DIR = "routes/system-admin";

/** accents that must not appear on the landing surface — `--primary` may */
const SECOND_ACCENTS =
  /var\(--(positive|destructive|success|warning|info|chart-\d+)\)/;

const landingFiles = readdirSync(join(import.meta.dirname))
  .filter((f) => f.startsWith("landing-") && !f.includes(".test."))
  .map((f) => ({
    file: `${DIR}/${f}`,
    src: readFileSync(join(import.meta.dirname, f), "utf-8"),
  }));

describe("the admin landing carries a single accent", () => {
  it("reads every landing file", () => {
    // guards the glob: an empty list would make the assertions below vacuous
    expect(landingFiles.length).toBeGreaterThan(4);
  });

  it("uses no accent other than --primary", () => {
    const offenders = landingFiles
      .filter(({ src }) => SECOND_ACCENTS.test(src))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("has no per-category colour map left", () => {
    // strip comments first — the files explain the old TONE_COLOR by name, and
    // that history is worth keeping; it's the code that must not resurrect it
    const offenders = landingFiles
      .filter(({ src }) =>
        /TONE_COLOR|\btint\b/.test(
          src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""),
        ),
      )
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
