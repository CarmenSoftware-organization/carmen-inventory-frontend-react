import { describe, expect, it, vi } from "vitest";

vi.mock("@/changelog.json", () => ({
  default: {
    current: "1.2.0",
    generated_at: "2026-05-28T00:00:00.000Z",
    versions: [
      {
        version: "1.2.0",
        build: "1.2.0-build.20260528.aaaaaaa",
        date: "2026-05-28",
        commit: "aaaaaaa",
        changes: { added: [], fixed: [], changed: [] },
      },
      {
        version: "1.0.0",
        build: "1.0.0-build.20260526.bbbbbbb",
        date: "2026-05-26",
        commit: "bbbbbbb",
        note: "init",
        changes: { added: [], fixed: [], changed: [] },
      },
    ],
  },
}));

describe("lib/changelog", () => {
  it("exposes current version, latest entry, and full list", async () => {
    const { CURRENT_VERSION, LATEST, CHANGELOG } = await import("@/lib/changelog");
    expect(CURRENT_VERSION).toBe("1.2.0");
    expect(LATEST.version).toBe("1.2.0");
    expect(CHANGELOG.versions).toHaveLength(2);
  });
});
