import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const DIR = "routes/system-admin";

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
