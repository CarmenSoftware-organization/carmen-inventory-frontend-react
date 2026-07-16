import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Button labels are normal-size text, so WCAG 2.1 AA wants 4.5:1 against the
 * button's own background. Nothing in the type system links `--success` in
 * globals.css to `text-white` in button.tsx, so a token tweak can drop a
 * variant below the line silently — this reads both files and does the math.
 */
const AA_NORMAL_TEXT = 4.5;

const ROOT = join(import.meta.dirname, "../..");
const css = readFileSync(join(ROOT, "styles/globals.css"), "utf-8");
const button = readFileSync(join(ROOT, "components/ui/button.tsx"), "utf-8");

type Rgb = [number, number, number];

function oklchToSrgb(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => {
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

/** Composite `fg` at `alpha` over `bg` — mirrors Tailwind's `bg-x/60`. */
function over(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as Rgb;
}

function block(selector: string): string {
  const m = new RegExp(`${selector}\\s*\\{(.*?)\\n\\}`, "s").exec(css);
  if (!m) throw new Error(`globals.css: no ${selector} block`);
  return m[1];
}

const THEMES = { light: block(":root"), dark: block("\\.dark") };

function token(theme: keyof typeof THEMES, name: string): Rgb {
  const m = new RegExp(
    `--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`,
  ).exec(THEMES[theme]);
  if (!m) throw new Error(`globals.css: --${name} missing from ${theme}`);
  return oklchToSrgb(Number(m[1]), Number(m[2]), Number(m[3]));
}

const WHITE: Rgb = [1, 1, 1];
const BLACK: Rgb = [0, 0, 0];

/** The class string button.tsx declares for a variant — the source of truth. */
function variantClasses(variant: string): string {
  const m = new RegExp(`\\b${variant}:\\s*\\n?\\s*"([^"]+)"`).exec(button);
  if (!m) throw new Error(`button.tsx: no ${variant} variant`);
  return m[1];
}

/**
 * The label colour button.tsx actually declares for a variant in a theme, so
 * the ratios below are computed from the real pair rather than a copy of it —
 * flipping `text-black` back to `text-white` has to move a number here.
 */
function labelColour(variant: string, theme: "light" | "dark"): Rgb {
  const classes = variantClasses(variant);
  const dark = /dark:text-(white|black)/.exec(classes)?.[1];
  const base = /(?:^|\s)text-(white|black)/.exec(classes)?.[1];
  const name = theme === "dark" ? (dark ?? base) : base;
  if (!name) throw new Error(`button.tsx: ${variant} declares no text-white/black`);
  return name === "white" ? WHITE : BLACK;
}

describe("button variants meet WCAG AA against their own background", () => {
  // Guards the fix for success (was 2.11:1 on white) and dark info (3.02:1).
  it.each([
    { variant: "success", theme: "light" as const },
    { variant: "success", theme: "dark" as const },
    { variant: "info", theme: "light" as const },
    { variant: "info", theme: "dark" as const },
    { variant: "warning", theme: "light" as const },
    { variant: "warning", theme: "dark" as const },
  ])("$variant / $theme", ({ variant, theme }) => {
    const ratio = contrast(token(theme, variant), labelColour(variant, theme));
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("destructive passes in dark mode, where it is composited at 60%", () => {
    const effective = over(token("dark", "destructive"), token("dark", "card"), 0.6);
    expect(contrast(effective, WHITE)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  /**
   * Every `bg-x text-x-foreground` pairing, not just the button's — the same
   * two tokens dress badges, sidebar items and anything else that needs a
   * filled surface, so a token nudge has to clear the bar for all of them.
   *
   * `primary`/`sidebar-primary` on dark were 4.11:1 and `destructive` 3.34:1
   * (light) / 3.25:1 (dark) until the tokens moved.
   */
  it.each([
    ["primary", "primary-foreground"],
    ["sidebar-primary", "sidebar-primary-foreground"],
    ["destructive", "destructive-foreground"],
    ["secondary", "secondary-foreground"],
    ["accent", "accent-foreground"],
    ["muted", "muted-foreground"],
    ["card", "card-foreground"],
    ["background", "foreground"],
  ])("%s / %s in both themes", (bg, fg) => {
    for (const theme of ["light", "dark"] as const) {
      expect(
        contrast(token(theme, bg), token(theme, fg)),
        `${bg}/${fg} in ${theme}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  /**
   * `--primary` on dark has to serve two jobs that pull apart: a fill behind
   * `--primary-foreground`, and `text-primary` for links on the page itself.
   * No lightness satisfies both with a white label — which is why the label
   * went dark and the token went brighter. Guard the second job too.
   */
  it.each(["background", "card"])(
    "text-primary stays readable on dark %s",
    (surface) => {
      expect(
        contrast(token("dark", "primary"), token("dark", surface)),
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    },
  );

  it.each([
    ["light", "background"],
    ["dark", "background"],
  ])("text-destructive stays readable on %s %s", (theme, surface) => {
    expect(
      contrast(
        token(theme as "light" | "dark", "destructive"),
        token(theme as "light" | "dark", surface),
      ),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("reads the label colour from button.tsx rather than assuming it", () => {
    expect(labelColour("success", "light")).toEqual(BLACK);
    expect(labelColour("success", "dark")).toEqual(BLACK);
    // info's background flips brightness with the theme, so its label does too
    expect(labelColour("info", "light")).toEqual(WHITE);
    expect(labelColour("info", "dark")).toEqual(BLACK);
  });
});

/**
 * `--x-foreground` is x-coloured text for a page background — it turns light in
 * dark mode. Pairing it with a solid `bg-x` therefore lands amber-on-amber
 * (1.07:1 in the offline banner) or teal-on-teal. The tint form (`bg-x/10
 * text-x-foreground`) is the correct and common use, so only the solid form is
 * banned here.
 */
describe("no solid semantic background pairs with its own -foreground token", () => {
  const SEMANTIC = ["warning", "success", "info"] as const;

  function tsxFiles(dir: string): string[] {
    return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) return tsxFiles(rel);
      return e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx")
        ? [rel]
        : [];
    });
  }

  const sources = ["components", "routes"]
    .flatMap(tsxFiles)
    .map((file) => ({ file, src: readFileSync(join(ROOT, file), "utf-8") }));

  it.each(SEMANTIC)("%s", (name) => {
    // bg-x not followed by "/" (that would be the tint form), same class string
    const bad = new RegExp(
      `bg-${name}(?![-/\\w])[^"'\`]*text-${name}-foreground`,
    );
    const offenders = sources
      .filter(({ src }) => bad.test(src))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
