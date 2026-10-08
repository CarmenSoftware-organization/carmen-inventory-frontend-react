import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseReportDialog, type ParsedDialog } from "./parse-report-dialog";

// jsdom ทำให้ import.meta.url เป็น http:// — ใช้ dirname ของไฟล์แทน
const DIR = join(import.meta.dirname, "__fixtures__/dialog-xml/");

interface ExpectedCell {
  kind: string;
  colSpan: number;
  names: string[];
  labels?: string[];
  heading?: string;
}

function summarize(parsed: ParsedDialog) {
  return {
    cols: parsed.cols,
    cells: parsed.cells.map((c): ExpectedCell => {
      if (c.kind === "range")
        return { kind: "range", colSpan: c.colSpan, names: [c.from.name, c.to.name], labels: [c.label] };
      if (c.kind === "group")
        return {
          kind: "group",
          colSpan: c.colSpan,
          names: c.fields.map((f) => f.control.name),
          labels: c.fields.map((f) => f.label),
          heading: c.label,
        };
      return { kind: "single", colSpan: c.colSpan, names: [c.control.name], labels: [c.label] };
    }),
  };
}

// labels / heading เทียบเฉพาะ fixture ที่ระบุไว้ — fixture ชุดเดิมไม่มีสองคีย์นี้
const fit = (actual: ExpectedCell[], expected: ExpectedCell[]): ExpectedCell[] =>
  actual.map((c, i) => {
    const e = expected[i] ?? {};
    const out: ExpectedCell = { kind: c.kind, colSpan: c.colSpan, names: c.names };
    if ("labels" in e) out.labels = c.labels;
    if ("heading" in e) out.heading = c.heading;
    return out;
  });

const names = readdirSync(DIR)
  .filter((f) => f.endsWith(".xml"))
  .map((f) => f.replace(/\.xml$/, ""));

describe("dialog XML fixtures", () => {
  it.each(names)("%s", (name) => {
    const xml = readFileSync(`${DIR}${name}.xml`, "utf8");
    const expected = JSON.parse(
      readFileSync(`${DIR}${name}.expected.json`, "utf8"),
    ) as { cols: number; cells: ExpectedCell[] };

    const s = summarize(parseReportDialog(xml));
    expect({ cols: s.cols, cells: fit(s.cells, expected.cells) }).toEqual({
      cols: expected.cols,
      cells: expected.cells,
    });
  });
});
