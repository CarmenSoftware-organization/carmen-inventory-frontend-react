import { describe, it, expect } from "vitest";
import type { DatasetParam } from "@/types/dashboard-widget";
import {
  defaultParamsFor,
  inferSubTile,
  inferWidgetTypeFromShape,
  shouldShowAllOption,
  SUPPORTED_SHAPES,
} from "../widget-shape";

describe("inferWidgetTypeFromShape", () => {
  it.each([
    ["scalar", "kpi"],
    ["scalar_delta", "kpi"],
    ["time_series", "line"],
    ["categorical", "pie"],
    ["ranked", "bar"],
    ["matrix", "heatmap"],
    ["table", "table"],
  ])("maps %s → %s", (shape, expected) => {
    expect(inferWidgetTypeFromShape(shape)).toBe(expected);
  });

  it("falls back to kpi for an unknown shape", () => {
    expect(inferWidgetTypeFromShape("nonsense")).toBe("kpi");
  });

  it("only yields widget types that SUPPORTED_SHAPES can render", () => {
    // ทุก shape ที่เรารองรับต้อง map ไปเป็น type ที่ WidgetRenderer มี case รองรับ
    const renderable = new Set(["kpi", "pie", "bar", "line", "area", "table"]);
    for (const shape of SUPPORTED_SHAPES) {
      expect(renderable).toContain(inferWidgetTypeFromShape(shape));
    }
  });

  it("excludes matrix — no card renders it", () => {
    expect(SUPPORTED_SHAPES).not.toContain("matrix");
  });
});

describe("defaultParamsFor", () => {
  const params: readonly DatasetParam[] = [
    { name: "granularity", label: "Granularity", type: "text", required: false, default: "day", options: ["day", "week", "month"] },
    { name: "days", label: "Look-back (days)", type: "int", required: false, default: 30 },
    { name: "status", label: "PR status", type: "text", required: false, default: "", options: ["draft"] },
  ];

  it("seeds every param from its default", () => {
    expect(defaultParamsFor(params)).toEqual({
      granularity: "day",
      days: 30,
      status: "",
    });
  });

  it("keeps an empty-string default (status = ทุกสถานะ)", () => {
    expect(defaultParamsFor(params).status).toBe("");
  });

  it("returns {} for a dataset with no params", () => {
    expect(defaultParamsFor([])).toEqual({});
    expect(defaultParamsFor()).toEqual({});
  });

  it("skips params that declare no default", () => {
    const noDefault: readonly DatasetParam[] = [
      { name: "x", label: "X", type: "text", required: true },
    ];
    expect(defaultParamsFor(noDefault)).toEqual({});
  });
});

describe("inferSubTile", () => {
  it.each([
    ["lab.pr-created-series", "purchaseRequest"],
    ["lab.po-spend-series", "purchaseOrder"],
    ["lab.pr-amount-by-department", "purchaseRequest"],
    ["inventory.physical-count-pending", "physicalCount"],
    ["workflow.grn-pending", "goodsReceiveNote"],
    // encapsulated document.* family (PR/PO/SR/GRN)
    ["document.pr-by-status", "purchaseRequest"],
    ["document.po-created-series", "purchaseOrder"],
    ["document.sr-count", "storeRequisition"],
    ["document.grn-pending", "goodsReceiveNote"],
  ])("maps %s → %s", (id, expected) => {
    expect(inferSubTile(id)).toBe(expected);
  });
});

describe("shouldShowAllOption", () => {
  const P = (o: Partial<DatasetParam>): DatasetParam => ({
    name: "x",
    label: "X",
    type: "text",
    required: false,
    ...o,
  });

  it("shows All for a non-required param with empty-string default (status)", () => {
    expect(shouldShowAllOption(P({ default: "", options: ["draft"] }))).toBe(true);
  });

  it("shows All for a non-required param with no default", () => {
    expect(shouldShowAllOption(P({ options: ["a", "b"] }))).toBe(true);
  });

  it("hides All for a param with a meaningful default (time_range token)", () => {
    expect(
      shouldShowAllOption(P({ default: "@1month", options: ["@today", "@1month"] })),
    ).toBe(false);
  });

  it("hides All for a required param", () => {
    expect(shouldShowAllOption(P({ required: true, default: "", options: ["a"] }))).toBe(
      false,
    );
  });
});
