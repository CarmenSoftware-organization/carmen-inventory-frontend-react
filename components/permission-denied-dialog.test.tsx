import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PermissionDeniedDialog,
  dispatchPermissionDenied,
} from "./permission-denied-dialog";

// t(key) → key
vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

function open(message?: string) {
  render(<PermissionDeniedDialog />);
  act(() => dispatchPermissionDenied(undefined, message));
}

describe("PermissionDeniedDialog", () => {
  it("stays closed until the event fires", () => {
    render(<PermissionDeniedDialog />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("opens on the event and shows the generic copy", () => {
    open();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("contactAdmin")).toBeInTheDocument();
  });

  it("prefers the message the dispatcher supplied", () => {
    open("You cannot void a committed GRN");
    expect(
      screen.getByText("You cannot void a committed GRN"),
    ).toBeInTheDocument();
    expect(screen.queryByText("description")).toBeNull();
  });

  it("closes on the action button", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    open();
    await userEvent.click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

/**
 * docs/DESIGN.md: "semantic colors should appear ONCE per element, never
 * clustered. Repeating one color across icon-box + icon + chip on a neutral
 * surface reads as glowing/neon … error state = red icon only; neutral box,
 * muted label, neutral border."
 *
 * This dialog once carried nine destructive signals (tinted border, corner
 * radial-gradient, gradient tile, pulsing glow, icon, and a chip with its own
 * fill/text/border/dot). Asserting on the source keeps them from creeping back:
 * the rendered DOM cannot show that a colour is *absent* from the design.
 */
describe("chrome stays flat and single-signal", () => {
  const src = readFileSync(
    join(import.meta.dirname, "permission-denied-dialog.tsx"),
    "utf-8",
  );

  it("uses exactly one destructive signal — the icon", () => {
    const signals = src.match(/destructive/g) ?? [];
    expect(signals).toHaveLength(1);
    expect(src).toContain('<ShieldOff className="text-destructive"');
  });

  it.each([
    ["gradients", /gradient/i],
    ["a keyframe/glow animation", /@keyframes|animation:/],
    ["a hardcoded rgba colour", /rgba\(/],
    ["an inline style block", /<style>/],
  ])("has no %s", (_label, pattern) => {
    expect(src).not.toMatch(pattern);
  });

  it("lets AlertDialogMedia keep its neutral bg-muted default", () => {
    expect(src).toContain("<AlertDialogMedia>");
    expect(src).not.toMatch(/AlertDialogMedia[^>]*className/);
  });
});
