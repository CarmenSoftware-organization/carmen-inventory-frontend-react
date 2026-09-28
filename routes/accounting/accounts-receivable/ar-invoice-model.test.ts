import { describe, expect, it } from "vitest";
import {
  AR_INVOICES,
  dueDate,
  invoiceTotals,
  journalPreviewTotals,
  lineUnpaid,
} from "./ar-invoice-model";

describe("AR invoice amounts", () => {
  it("keeps WHT informational and applies deposit only to unpaid balance", () => {
    const invoice = AR_INVOICES[0];
    expect(invoiceTotals(invoice)).toEqual({
      subtotal: 100,
      discount: 10,
      net: 90,
      tax1: 6.3,
      tax2: 0,
      tax: 6.3,
      total: 96.3,
      unpaid: 74.9,
    });
    expect(lineUnpaid(invoice, 0)).toBe(74.9);
    expect(journalPreviewTotals(invoice)).toEqual({
      debit: 3370.5,
      credit: 3370.5,
      variance: 0,
    });
    expect(dueDate(invoice.inputDate, invoice.creditDays)).toBe("2026-10-20");
    expect(
      invoiceTotals({
        ...invoice,
        lines: [{ ...invoice.lines[0], tax2Rate: 2 }],
      }),
    ).toMatchObject({ tax1: 6.3, tax2: 1.8, total: 98.1, unpaid: 76.7 });
  });
});
