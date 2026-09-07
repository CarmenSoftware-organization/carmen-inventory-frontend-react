import { describe, it, expect } from "vitest";
import { docHref, idColumnKey } from "../table-row-link";
import type { TableData } from "@/types/dashboard-widget";

const table = (cols: TableData["columns"]): TableData => ({
  columns: cols,
  rows: [],
});

describe("idColumnKey", () => {
  it("finds the column carrying the document id", () => {
    expect(
      idColumnKey(
        table([
          { key: "id", label: "", type: "id" },
          { key: "status", label: "Status", type: "text" },
        ]),
      ),
    ).toBe("id");
    expect(
      idColumnKey(table([{ key: "doc_id", label: "", type: "id" }])),
    ).toBe("doc_id");
  });

  it("returns null when the dataset carries no id", () => {
    expect(idColumnKey(table([{ key: "a", label: "A", type: "text" }]))).toBeNull();
    expect(idColumnKey(null)).toBeNull();
  });
});

describe("docHref", () => {
  const row = { id: "019638a6-2a00-7c4f-8e46-9b7a52c80c4d" };

  it("routes each document family to its own detail page", () => {
    expect(docHref("document.pr-table", row, "id")).toBe(
      "/procurement/purchase-request/019638a6-2a00-7c4f-8e46-9b7a52c80c4d",
    );
    expect(docHref("document.po-rejected", { doc_id: "po-1" }, "doc_id")).toBe(
      "/procurement/purchase-order/po-1",
    );
    expect(docHref("document.sr-sent-back", { doc_id: "sr-1" }, "doc_id")).toBe(
      "/store-operation/store-requisition/sr-1",
    );
  });

  // ตารางที่ไม่ได้ชี้ไปเอกสาร (below-par ฯลฯ) ต้องไม่กลายเป็นแถวกดได้ที่กดแล้วเงียบ
  it("returns null for a dataset with no detail page", () => {
    expect(docHref("inventory.below-par-items", row, "id")).toBeNull();
  });

  it("returns null when the row has no usable id", () => {
    expect(docHref("document.pr-table", {}, "id")).toBeNull();
    expect(docHref("document.pr-table", { id: "" }, "id")).toBeNull();
    expect(docHref("document.pr-table", { id: 42 }, "id")).toBeNull();
    expect(docHref("document.pr-table", row, null)).toBeNull();
  });

  it("escapes the id instead of pasting it into the path raw", () => {
    expect(docHref("document.pr-table", { id: "a/b?c" }, "id")).toBe(
      "/procurement/purchase-request/a%2Fb%3Fc",
    );
  });
});
