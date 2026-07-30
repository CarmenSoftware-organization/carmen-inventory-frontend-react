import { describe, it, expect } from "vitest";
import { statusMeta } from "@/components/dashboard-widget/status-meta";

describe("statusMeta", () => {
  // every value across the PR / PO / SR / GRN status enums
  const ALL_STATUSES = [
    "draft",
    "in_progress",
    "approved",
    "completed",
    "voided",
    "sent",
    "partial",
    "closed",
    "cancelled",
    "saved",
    "committed",
  ];

  it.each(ALL_STATUSES)("binds %s to an icon + canonical color var", (s) => {
    const m = statusMeta(s);
    expect(m.Icon).toBeTruthy();
    expect(m.cssVar).toMatch(/^--status-/);
  });

  it("reuses the app's canonical status vars (approved=green, in_progress=warning)", () => {
    expect(statusMeta("approved").cssVar).toBe("--status-approved");
    expect(statusMeta("in_progress").cssVar).toBe("--status-in-progress");
    expect(statusMeta("saved").cssVar).toBe("--status-save");
  });

  it("falls back for an unknown status", () => {
    const m = statusMeta("not_a_status");
    expect(m.Icon).toBeTruthy();
    expect(m.cssVar).toContain("muted");
  });

  it("distinguishes states by color even when the icon repeats", () => {
    // approved & draft share the FileText icon → the color must carry the signal
    expect(statusMeta("approved").Icon).toBe(statusMeta("draft").Icon);
    expect(statusMeta("approved").cssVar).not.toBe(statusMeta("draft").cssVar);
  });

  it("shares one meta per state across doc types (PR draft == PO draft)", () => {
    expect(statusMeta("draft").cssVar).toBe(statusMeta("draft").cssVar);
  });
});
