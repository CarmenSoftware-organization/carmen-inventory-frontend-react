import { describe, it, expect } from "vitest";
import {
  cn,
  sanitizeText,
  sanitizeUrl,
  safeNavigationHref,
  safeInternalHref,
} from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    const enabled = false as boolean;
    expect(cn("px-2", enabled && "py-1")).toBe("px-2");
  });

  it("merges conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles undefined and null", () => {
    expect(cn("px-2", undefined, null)).toBe("px-2");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });
});

describe("sanitizeText", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText("")).toBe("");
  });

  it("strips angle brackets that could open HTML tags", () => {
    expect(sanitizeText("PR-001 <img onerror=alert(1)>")).toBe(
      "PR-001 img onerror=alert(1)",
    );
    expect(sanitizeText("<script>alert(1)</script>")).toBe(
      "scriptalert(1)/script",
    );
  });

  it("preserves normal text, spaces, and hyphens", () => {
    expect(sanitizeText("PR-001 approved")).toBe("PR-001 approved");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });
});

describe("sanitizeUrl", () => {
  it("canonicalizes valid http/https URLs", () => {
    expect(sanitizeUrl("https://carmen.app")).toBe("https://carmen.app/");
    expect(sanitizeUrl("  http://x.com/a  ")).toBe("http://x.com/a");
  });

  it("rejects dangerous schemes", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeUrl("data:text/html,<script>")).toBeUndefined();
    expect(sanitizeUrl("vbscript:msgbox(1)")).toBeUndefined();
  });

  it("rejects URLs containing control characters", () => {
    const withControl = "https://x.com/" + String.fromCharCode(31);
    expect(sanitizeUrl(withControl)).toBeUndefined();
  });

  it("rejects non-URL strings", () => {
    expect(sanitizeUrl("not a url")).toBeUndefined();
    expect(sanitizeUrl("")).toBeUndefined();
  });
});

describe("safeNavigationHref", () => {
  it("returns null for empty/nullish input", () => {
    expect(safeNavigationHref(null)).toBeNull();
    expect(safeNavigationHref(undefined)).toBeNull();
    expect(safeNavigationHref("")).toBeNull();
  });

  it("accepts safe internal paths", () => {
    expect(safeNavigationHref("/procurement/purchase-request/123")).toBe(
      "/procurement/purchase-request/123",
    );
    expect(safeNavigationHref("  /some/page  ")).toBe("/some/page");
  });

  it("accepts canonicalized http/https URLs", () => {
    expect(safeNavigationHref("https://carmen.app")).toBe("https://carmen.app/");
  });

  it("rejects protocol-relative and backslash-mangled paths", () => {
    expect(safeNavigationHref("//evil.com")).toBeNull();
    expect(safeNavigationHref("/path\\with\\backslash")).toBeNull();
  });

  it("rejects dangerous schemes and control characters", () => {
    expect(safeNavigationHref("javascript:alert(1)")).toBeNull();
    expect(safeNavigationHref("/ok" + String.fromCharCode(0))).toBeNull();
  });
});

describe("safeInternalHref", () => {
  it("returns trimmed internal paths", () => {
    expect(safeInternalHref("/procurement/purchase-request/123")).toBe(
      "/procurement/purchase-request/123",
    );
    expect(safeInternalHref("  /some/page?tab=1#x  ")).toBe("/some/page?tab=1#x");
  });

  it("returns null for empty/nullish input", () => {
    expect(safeInternalHref(null)).toBeNull();
    expect(safeInternalHref(undefined)).toBeNull();
    expect(safeInternalHref("")).toBeNull();
  });

  it("rejects absolute and external URLs (open-redirect guard)", () => {
    expect(safeInternalHref("https://evil.com")).toBeNull();
    expect(safeInternalHref("http://evil.com/path")).toBeNull();
    expect(safeInternalHref("javascript:alert(1)")).toBeNull();
    expect(safeInternalHref("mailto:a@b.com")).toBeNull();
  });

  it("rejects protocol-relative and backslash-mangled paths", () => {
    expect(safeInternalHref("//evil.com")).toBeNull();
    expect(safeInternalHref("/\\evil.com")).toBeNull();
    expect(safeInternalHref("/path\\x")).toBeNull();
  });

  it("rejects paths containing control characters", () => {
    expect(safeInternalHref("/ok" + String.fromCharCode(31))).toBeNull();
  });
});
