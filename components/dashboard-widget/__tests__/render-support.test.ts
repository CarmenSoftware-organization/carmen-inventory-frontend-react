import { describe, it, expect } from "vitest";
import {
  availableRenders,
  defaultRenderFor,
} from "../render-support";

describe("availableRenders", () => {
  // ชุดจริง = สิ่งที่ backend บอกว่าสมเหตุสมผล ∩ การ์ดที่ frontend มี
  it("intersects the backend set with the cards that exist", () => {
    // BE ยอมให้ categorical เป็น table ด้วย แต่ TableCard ต้องการ {columns, rows}
    expect(availableRenders("categorical", ["bar", "pie", "table"])).toEqual([
      "pie",
      "bar",
    ]);
    // BE ยอมให้ time_series เป็น bar/sparkline — ยังไม่มี adapter/การ์ด
    expect(
      availableRenders("time_series", ["line", "area", "bar", "sparkline"]),
    ).toEqual(["line", "area"]);
    // gauge ยังไม่มีการ์ด
    expect(availableRenders("scalar", ["kpi", "gauge"])).toEqual(["kpi"]);
  });

  it("drops a render the backend does not advertise", () => {
    // ranked วาด pie ได้ทางเทคนิค (payload มี label+value) แต่ BE ไม่ประกาศไว้
    expect(availableRenders("ranked", ["bar", "table"])).toEqual(["bar"]);
  });

  it("falls back to card capability when the backend sends no set", () => {
    expect(availableRenders("categorical")).toEqual(["pie", "bar"]);
    expect(availableRenders("time_series", [])).toEqual(["line", "area"]);
  });

  it("returns nothing for a shape no card can draw", () => {
    expect(availableRenders("matrix", ["heatmap", "table"])).toEqual([]);
    expect(availableRenders(undefined)).toEqual([]);
    expect(availableRenders("nonsense")).toEqual([]);
  });
});

describe("defaultRenderFor", () => {
  it("keeps the picker's existing defaults", () => {
    expect(defaultRenderFor("categorical", ["bar", "pie", "table"])).toBe("pie");
    expect(defaultRenderFor("ranked", ["bar", "table"])).toBe("bar");
    expect(defaultRenderFor("time_series")).toBe("line");
    expect(defaultRenderFor("scalar_delta")).toBe("kpi");
  });

  it("does not pick a preferred render the backend excluded", () => {
    expect(defaultRenderFor("categorical", ["bar", "table"])).toBe("bar");
  });

  it("falls back to kpi when nothing is drawable", () => {
    expect(defaultRenderFor("matrix", ["heatmap"])).toBe("kpi");
  });
});
