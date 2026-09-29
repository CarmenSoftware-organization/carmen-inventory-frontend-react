import { describe, expect, it } from "vitest";
import {
  buildApDashboardSnapshot,
  getAccountingDashboardSnapshot,
} from "./dashboard-mock-data";

describe("accounting dashboard snapshots", () => {
  it("keeps GL, AR and Asset operational metrics module-specific", () => {
    const gl = getAccountingDashboardSnapshot("generalLedger");
    const ar = getAccountingDashboardSnapshot("accountsReceivable");
    const asset = getAccountingDashboardSnapshot("asset");

    expect(gl.operational.metrics.map((item) => item.id)).toContain("unposted");
    expect(ar.operational.metrics.map((item) => item.id)).toContain(
      "unapplied",
    );
    expect(asset.operational.metrics.map((item) => item.id)).toContain(
      "depreciation",
    );
    expect(new Set([gl.title.en, ar.title.en, asset.title.en]).size).toBe(3);
  });

  it("includes management analysis and action queues for every module", () => {
    const snapshots = [
      getAccountingDashboardSnapshot("generalLedger"),
      getAccountingDashboardSnapshot("accountsReceivable"),
      getAccountingDashboardSnapshot("asset"),
      buildApDashboardSnapshot(),
    ];
    for (const snapshot of snapshots) {
      expect(snapshot.management.metrics.length).toBeGreaterThanOrEqual(4);
      expect(snapshot.management.analyses.length).toBeGreaterThanOrEqual(2);
      expect(snapshot.operational.tasks.length).toBeGreaterThan(0);
    }
  });
});
