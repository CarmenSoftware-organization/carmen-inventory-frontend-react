import { describe, it, expect } from "vitest";
import {
  isCategoricalData,
  isScalarDeltaData,
  isTableData,
  isTimeSeriesData,
} from "../dashboard-widget";

describe("isCategoricalData", () => {
  it("รับ array ของ {label, value}", () => {
    expect(isCategoricalData([{ label: "draft", value: 3 }])).toBe(true);
  });

  it("รับ array ว่าง (dataset ที่ยังไม่มีข้อมูล)", () => {
    expect(isCategoricalData([])).toBe(true);
  });

  it("ปฏิเสธ time_series — กัน PieCard วาด pie มั่วจาก {date, value}", () => {
    expect(isCategoricalData([{ date: "2026-07-01", value: 5 }])).toBe(false);
  });

  it("รับ ranked ได้ เพราะมี label+value (BarCard ใช้ร่วมกัน)", () => {
    expect(isCategoricalData([{ rank: 1, label: "V-01", value: 9 }])).toBe(
      true,
    );
  });

  it("ปฏิเสธ non-array", () => {
    expect(isCategoricalData({ value: 1 })).toBe(false);
    expect(isCategoricalData(null)).toBe(false);
  });
});

describe("guards stay mutually exclusive for the shapes we render", () => {
  const timeSeries = [{ date: "2026-07-01", value: 5 }];
  const categorical = [{ label: "draft", value: 3 }];

  it("time_series ผ่าน isTimeSeriesData ตัวเดียว", () => {
    expect(isTimeSeriesData(timeSeries)).toBe(true);
    expect(isCategoricalData(timeSeries)).toBe(false);
    expect(isScalarDeltaData(timeSeries)).toBe(false);
  });

  it("categorical ไม่ผ่าน isTimeSeriesData", () => {
    expect(isTimeSeriesData(categorical)).toBe(false);
    expect(isCategoricalData(categorical)).toBe(true);
  });
});

describe("isTableData", () => {
  const table = {
    columns: [{ key: "pr", label: "PR Number" }],
    rows: [{ pr: "PR-1" }],
  };

  it("รับ {columns, rows}", () => {
    expect(isTableData(table)).toBe(true);
  });

  it("รับ columns/rows ว่าง", () => {
    expect(isTableData({ columns: [], rows: [] })).toBe(true);
  });

  it("ปฏิเสธ matrix {rows, cols, values} — ไม่มี columns", () => {
    expect(isTableData({ rows: ["a"], cols: ["b"], values: [[1]] })).toBe(
      false,
    );
  });

  it("ปฏิเสธ categorical array และ scalar", () => {
    expect(isTableData([{ label: "x", value: 1 }])).toBe(false);
    expect(isTableData({ value: 3 })).toBe(false);
    expect(isTableData(null)).toBe(false);
  });
});
