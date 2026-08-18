import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PERMISSION_DENIED_EVENT,
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

describe("dispatchPermissionDenied — reason parameter", () => {
  function captureDetail(dispatch: () => void) {
    let detail: unknown;
    const handler = (e: Event) => {
      detail = (e as CustomEvent).detail;
    };
    window.addEventListener(PERMISSION_DENIED_EVENT, handler);
    act(dispatch);
    window.removeEventListener(PERMISSION_DENIED_EVENT, handler);
    return detail;
  }

  it('defaults to "permission" when the 3rd argument is omitted — unchanged behaviour', () => {
    const detail = captureDetail(() => dispatchPermissionDenied());
    expect(detail).toMatchObject({ reason: "permission" });
  });

  it('defaults to "permission" even when a permission and message are supplied', () => {
    const detail = captureDetail(() =>
      dispatchPermissionDenied(undefined, "custom message"),
    );
    expect(detail).toMatchObject({ reason: "permission" });
  });

  it("passes through an explicit reason", () => {
    const detail = captureDetail(() =>
      dispatchPermissionDenied(undefined, undefined, "license"),
    );
    expect(detail).toMatchObject({ reason: "license" });
  });
});

describe("PermissionDeniedDialog — reason variants", () => {
  it('shows the generic permission copy + ShieldOff icon when reason is "permission" (default, unchanged)', () => {
    render(<PermissionDeniedDialog />);
    act(() => dispatchPermissionDenied());
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
    // AlertDialog renders into a Radix portal (document.body), not `container`
    const icon = document.querySelector("svg.lucide-shield-off");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("text-destructive");
  });

  it('shows the license copy + Lock icon when reason is "license"', () => {
    render(<PermissionDeniedDialog />);
    act(() => dispatchPermissionDenied(undefined, undefined, "license"));
    expect(screen.getByText("licenseTitle")).toBeInTheDocument();
    expect(screen.getByText("licenseDescription")).toBeInTheDocument();
    expect(screen.queryByText("title")).toBeNull();
    const icon = document.querySelector("svg.lucide-lock");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("text-destructive");
    expect(document.querySelector("svg.lucide-shield-off")).toBeNull();
  });

  it('shows the expired copy + CalendarX icon when reason is "expired"', () => {
    render(<PermissionDeniedDialog />);
    act(() => dispatchPermissionDenied(undefined, undefined, "expired"));
    expect(screen.getByText("expiredTitle")).toBeInTheDocument();
    expect(screen.getByText("expiredDescription")).toBeInTheDocument();
    expect(screen.queryByText("title")).toBeNull();
    const icon = document.querySelector("svg.lucide-calendar-x");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("text-destructive");
    expect(document.querySelector("svg.lucide-shield-off")).toBeNull();
  });

  it("still prefers an explicit message over the reason-specific copy", () => {
    render(<PermissionDeniedDialog />);
    act(() =>
      dispatchPermissionDenied(undefined, "custom override", "license"),
    );
    expect(screen.getByText("licenseTitle")).toBeInTheDocument();
    expect(screen.getByText("custom override")).toBeInTheDocument();
    expect(screen.queryByText("licenseDescription")).toBeNull();
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
