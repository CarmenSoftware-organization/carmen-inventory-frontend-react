import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * The status tokens (`--warning`, `--success`, …) are FILL colours — each has a
 * `-foreground` for the label that sits on it, and its lightness is tuned for
 * that. Used as `text-*` on the light canvas they measure warning 1.93 ·
 * success 1.99 · positive 3.20 · info 4.31, all under WCAG AA's 4.5:1. They all
 * pass on dark, so the light values were effectively tuned for the dark canvas.
 *
 * `--*-ink` are the same hue and chroma at a lightness that clears AA. This test
 * recomputes the ratios from globals.css rather than trusting the numbers in the
 * comment there, so a token tweak cannot quietly drop one below the line.
 */
const AA_NORMAL_TEXT = 4.5;

const ROOT = join(import.meta.dirname, "../..");
const css = readFileSync(join(ROOT, "styles/globals.css"), "utf-8");

type Rgb = [number, number, number];

function oklchToSrgb(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => {
    const x = Math.min(1, Math.max(0, c));
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  }) as Rgb;
}

function relativeLuminance([r, g, b]: Rgb): number {
  const f = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

/** the `:root` block is everything before `.dark {`; the dark block follows it */
const lightBlock = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
const darkBlock = css.slice(css.indexOf(".dark {"));

function token(name: string, dark: boolean): Rgb {
  const block = dark ? darkBlock : lightBlock;
  const m = block.match(
    new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`),
  );
  if (!m) throw new Error(`--${name} not found in ${dark ? ".dark" : ":root"}`);
  return oklchToSrgb(+m[1], +m[2], +m[3]);
}

const INKS = [
  "warning-ink",
  "success-ink",
  "info-ink",
  "positive-ink",
  "negative-ink",
  "brand-ink",
];

/**
 * The worst surface an ink can land on. In light mode that is the DARKEST light
 * surface (dark text loses contrast as the surface darkens); in dark mode the
 * LIGHTEST dark surface. Both happen to be `--accent`. Getting this backwards
 * yields inks that pass on the canvas and fail on every card — which is what a
 * first pass at these values actually did.
 */
const WORST_SURFACE = ["accent", "card", "popover", "background", "muted"];

describe("status inks clear WCAG AA as text", () => {
  for (const ink of INKS) {
    for (const dark of [false, true]) {
      it(`${ink} on the worst ${dark ? "dark" : "light"} surface`, () => {
        const fg = token(ink, dark);
        const worst = WORST_SURFACE.map((s) => ({
          s,
          r: contrast(fg, token(s, dark)),
        })).sort((a, b) => a.r - b.r)[0];
        expect(
          worst.r,
          `--${ink} on --${worst.s} is ${worst.r.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }
});

function tsxFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return tsxFiles(rel);
    return e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx") ? [rel] : [];
  });
}

describe("the fill/text split holds", () => {
  it("no component uses a fill status token as a text colour", () => {
    // `text-warning` etc. are the FILL colours — that is the bug this whole
    // split exists to fix. `-foreground` (label on a fill) and `-ink` are fine.
    const re = /\btext-(warning|success|info|positive|negative)(?![\w-])/;
    const offenders = ["components", "routes"]
      .flatMap(tsxFiles)
      .filter((f) => re.test(readFileSync(join(ROOT, f), "utf-8")));
    expect(offenders).toEqual([]);
  });

  it("still recognises the pattern it guards", () => {
    const re = /\btext-(warning|success|info|positive|negative)(?![\w-])/;
    expect(re.test(`className="text-warning"`)).toBe(true);
    expect(re.test(`className="text-success/80"`)).toBe(true);
    // must NOT fire on the two legitimate spellings
    expect(re.test(`className="text-warning-ink"`)).toBe(false);
    expect(re.test(`className="text-warning-foreground"`)).toBe(false);
  });
});
