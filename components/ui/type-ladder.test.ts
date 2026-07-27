import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * docs/DESIGN.md's ladder is 300 / 400 / 600 / 700, and 700 is reserved for
 * `{typography.tagline}` (21px). `{typography.micro-eyebrow}` (9px caps) and
 * `{typography.micro}` (11px numbers) both specify weight 600.
 *
 * `font-bold` on those has now been swept three times — inventory-management in
 * June, then thirteen more sites across system-admin / vendor-management /
 * report / ui. It keeps coming back because nothing catches it, so: this.
 */
const ROOT = join(import.meta.dirname, "../..");

/**
 * The one sanctioned sub-10px tier: `{typography.micro-eyebrow}` is 9px and
 * `{typography.micro-floor}` is 8px — same ladder, so both sizes want weight 600.
 *
 * Two spellings, because the tier is mid-migration: the arbitrary literals this
 * guard was written against (`text-[0.5625rem]` / `text-[0.5rem]`) are being
 * replaced by the `text-micro-eyebrow` / `text-micro-floor` utilities now that
 * the ladder exists in CSS. Matching only the literals would make this guard
 * pass vacuously for every migrated file — green, and blind. Keep BOTH arms
 * until the last literal is gone, then drop the first.
 *
 * Deliberately does not include a bare `text-micro` arm: that is the 11px tier,
 * and as a prefix of `text-micro-eyebrow` it would also blur the two together.
 */
const MICRO_EYEBROW = String.raw`(?:text-\[0\.5(?:625)?rem\]|text-micro-eyebrow|text-micro-floor)`;

function tsxFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return tsxFiles(rel);
    return e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx") ? [rel] : [];
  });
}

const sources = ["components", "routes"]
  .flatMap(tsxFiles)
  .map((file) => ({ file, src: readFileSync(join(ROOT, file), "utf-8") }));

/** class strings where a 9px size and font-bold sit together */
const offenders = (): string[] =>
  sources
    .filter(({ src }) =>
      new RegExp(
        `(${MICRO_EYEBROW}[^"'\`]*font-bold|font-bold[^"'\`]*${MICRO_EYEBROW})`,
      ).test(src),
    )
    .map(({ file }) => file);

describe("the 9px micro tier stays at weight 600", () => {
  /**
   * home-component.tsx is the un-ported source-app landing — nothing imports it
   * and CLAUDE.md says so explicitly, so it was left alone rather than swept.
   * Listing it here rather than filtering it out means this test starts failing
   * the moment it is deleted (good — delete this line too) or wired up (also
   * good — it would need the sweep first).
   */
  const KNOWN_DEAD = ["components/home-component.tsx"];

  it("has no font-bold on a 9px eyebrow in live code", () => {
    expect(offenders()).toEqual(KNOWN_DEAD);
  });

  it("still finds the pattern it claims to guard, in both spellings", () => {
    // guards the regex itself: if it silently stopped matching, the test above
    // would pass for the wrong reason. Both arms are probed — covering only the
    // literal is how this guard would go blind as the migration proceeds.
    const probes = [
      `text-[0.5625rem] font-bold tracking-widest uppercase`,
      `text-[0.5rem] font-bold tracking-widest uppercase`,
      `text-micro-eyebrow font-bold tracking-widest uppercase`,
      `text-micro-floor font-bold tracking-widest uppercase`,
    ];
    for (const probe of probes) {
      expect(
        new RegExp(`${MICRO_EYEBROW}[^"'\`]*font-bold`).test(probe),
        `should flag: ${probe}`,
      ).toBe(true);
    }
  });

  it("does not confuse the 11px tier for the 9px one", () => {
    // `text-micro` is a prefix of `text-micro-eyebrow`; a sloppy arm would drag
    // the whole 11px tier (55 sites in system-admin alone) into this guard.
    expect(
      new RegExp(`${MICRO_EYEBROW}[^"'\`]*font-bold`).test(
        `text-micro font-bold tabular-nums`,
      ),
    ).toBe(false);
    expect(
      new RegExp(`${MICRO_EYEBROW}[^"'\`]*font-bold`).test(
        `text-micro-legal font-bold`,
      ),
    ).toBe(false);
  });
});
