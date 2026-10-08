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
}

function summarize(parsed: ParsedDialog) {
  return {
    cols: parsed.cols,
    cells: parsed.cells.map((c): ExpectedCell => {
      if (c.kind === "range")
        return { kind: "range", colSpan: c.colSpan, names: [c.from.name, c.to.name] };
      if (c.kind === "group")
        return { kind: "group", colSpan: c.colSpan, names: c.fields.map((f) => f.control.name) };
      return { kind: "single", colSpan: c.colSpan, names: [c.control.name] };
    }),
  };
}

const names = readdirSync(DIR)
  .filter((f) => f.endsWith(".xml"))
  .map((f) => f.replace(/\.xml$/, ""));

describe("dialog XML fixtures", () => {
  it.each(names)("%s", (name) => {
    const xml = readFileSync(`${DIR}${name}.xml`, "utf8");
    const expected = JSON.parse(
      readFileSync(`${DIR}${name}.expected.json`, "utf8"),
    ) as { cols: number; cells: ExpectedCell[] };

    expect(summarize(parseReportDialog(xml))).toEqual({
      cols: expected.cols,
      cells: expected.cells,
    });
  });
});
