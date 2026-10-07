import { beforeEach, describe, expect, it } from "vitest";
import {
  REPORT_PARAM_TTL_MS,
  forgetReportParams,
  loadReportParams,
  reportParamKey,
  saveReportParams,
} from "./report-param-memory";

const NOW = Date.parse("2026-10-07T09:00:00.000Z");
const PARAMS = {
  values: { Period: "2026-05", ProductFrom: "P1" },
  labels: { ProductFrom: "P1 - Milk" },
};

beforeEach(() => localStorage.clear());

describe("report param memory", () => {
  it("gives back what was last run", () => {
    const key = reportParamKey("BU1", "tpl-1");
    saveReportParams(key, PARAMS, NOW);

    expect(loadReportParams(key, NOW + 60_000)).toEqual(PARAMS);
  });

  // พ้น 30 นาทีกลับไปใช้ค่าตั้งต้นของรายงาน และไม่ทิ้งของค้างไว้ใน storage
  it("forgets it 30 minutes after the last run", () => {
    const key = reportParamKey("BU1", "tpl-1");
    saveReportParams(key, PARAMS, NOW);

    expect(loadReportParams(key, NOW + REPORT_PARAM_TTL_MS)).toEqual(PARAMS);
    expect(
      loadReportParams(key, NOW + REPORT_PARAM_TTL_MS + 1),
    ).toBeUndefined();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("restarts the 30 minutes on every run", () => {
    const key = reportParamKey("BU1", "tpl-1");
    saveReportParams(key, PARAMS, NOW);
    saveReportParams(key, PARAMS, NOW + 20 * 60_000);

    expect(loadReportParams(key, NOW + 45 * 60_000)).toEqual(PARAMS);
  });

  // รหัสสินค้า/คลัง/งวดของ BU หนึ่งไม่มีความหมายในอีก BU
  it("keeps each business unit and report apart", () => {
    saveReportParams(reportParamKey("BU1", "tpl-1"), PARAMS, NOW);

    expect(
      loadReportParams(reportParamKey("BU2", "tpl-1"), NOW),
    ).toBeUndefined();
    expect(
      loadReportParams(reportParamKey("BU1", "tpl-2"), NOW),
    ).toBeUndefined();
  });

  it("forgets on request", () => {
    const key = reportParamKey("BU1", "tpl-1");
    saveReportParams(key, PARAMS, NOW);
    forgetReportParams(key);

    expect(loadReportParams(key, NOW)).toBeUndefined();
  });

  it("ignores a stored value it does not recognise", () => {
    const key = reportParamKey("BU1", "tpl-1");
    localStorage.setItem(key, "not json");
    expect(loadReportParams(key, NOW)).toBeUndefined();

    localStorage.setItem(key, JSON.stringify({ values: PARAMS.values }));
    expect(loadReportParams(key, NOW)).toBeUndefined();
  });
});
