import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { createTranslator } from "use-intl";
import en from "@/messages/en.json";
import th from "@/messages/th.json";
import { renderForm } from "@/lib/test-utils/form-characterization";

const grn = {
  id: "grn-1",
  good_received_note_detail: [
    {
      id: "d1",
      product: { id: "prod-beef", name: "Ground Beef", local_name: "" },
      location: { id: "loc-1", code: "L1", name: "Main" },
      items: [
        {
          id: "i1",
          received_qty: 5,
          received_unit: { id: "u-kg", name: "KG" },
          sub_total_price: 500,
        },
      ],
    },
    {
      id: "d2",
      product: { id: "prod-pork", name: "Pork neck", local_name: "" },
      location: { id: "loc-1", code: "L1", name: "Main" },
      items: [
        {
          id: "i2",
          received_qty: 3,
          received_unit: { id: "u-kg", name: "KG" },
          sub_total_price: 300,
        },
      ],
    },
  ],
};
vi.mock("@/hooks/use-goods-receive-note", () => ({
  useGoodsReceiveNoteById: () => ({ data: grn, isLoading: false, error: null }),
}));

let credited: Map<string, string> | undefined;
vi.mock("./use-grn-credited-products", () => ({
  useGrnCreditedProducts: () => ({ data: credited }),
}));

const { CnAddItemDialog } = await import("./cn-add-item-dialog");

const renderDialog = (currentCnNo?: string) =>
  renderForm(
    <CnAddItemDialog
      open
      onOpenChange={() => {}}
      grnId="grn-1"
      existingKeys={new Set()}
      onAdd={() => {}}
      currentCnNo={currentCnNo}
    />,
  );

const checkboxOf = (productName: string) =>
  screen.getByText(productName).closest("label")!.previousElementSibling as HTMLElement;

beforeEach(() => {
  credited = undefined;
});

// e2e CN.3 (2026-10-02): the dialog let the user pick a product another credit note had already
// returned from this receipt; Create then hit a 422 and the toast said "some fields aren't filled in".
describe("CnAddItemDialog — products already credited on the receipt", () => {
  it("locks a product another credit note already returned, and names that note", () => {
    credited = new Map([["prod-beef", "CN26070001"]]);
    renderDialog("");

    expect(checkboxOf("Ground Beef").getAttribute("data-disabled")).not.toBeNull();
    expect(
      screen.getByText(en.procurement.creditNote.alreadyCredited.replace("{cn}", "CN26070001")),
    ).toBeTruthy();
    expect(checkboxOf("Pork neck").getAttribute("data-disabled")).toBeNull();
  });

  it("does not lock a product the note being edited holds itself (it may be removed and re-added)", () => {
    credited = new Map([["prod-beef", "CN26070001"]]);
    renderDialog("CN26070001");

    expect(checkboxOf("Ground Beef").getAttribute("data-disabled")).toBeNull();
  });

  it("locks nothing when the references could not be loaded (the backend still guards)", () => {
    renderDialog("");

    expect(checkboxOf("Ground Beef").getAttribute("data-disabled")).toBeNull();
    expect(checkboxOf("Pork neck").getAttribute("data-disabled")).toBeNull();
  });
});

// Params must match what the backend catalog sends, or the message renders with holes.
describe("error messages for the codes the credit note, SR issue and RFP flows now return", () => {
  const cases: [string, Record<string, string | number>][] = [
    ["CREDIT_NOTE_LINE_ALREADY_CREDITED", { line: 1, product: "Ground Beef" }],
    ["CREDIT_NOTE_DISCOUNT_EXCEEDS_LINE", { line: 1, product: "A", amount: 50, line_amount: 10 }],
    ["CREDIT_NOTE_TAX_EXCEEDS_LINE", { line: 2, product: "B", amount: 40, line_amount: 10 }],
    ["CREDIT_NOTE_DISCOUNT_EXCEEDS_GRN", { line: 1, product: "A", amount: 9, allowed: 4.5 }],
    ["CREDIT_NOTE_TAX_EXCEEDS_GRN", { line: 1, product: "A", amount: 9, allowed: 4.5 }],
    ["CREDIT_NOTE_DATE_NOT_CURRENT_PERIOD", { period: "2607", start: "2026-07-01", end: "2026-07-31" }],
    ["SR_ISSUE_PERIOD_NOT_CURRENT", { period: "2608", current: "2607" }],
    ["SR_ISSUE_INSUFFICIENT_STOCK", { product: "Sugar", location: "Main Store", on_hand: 2, requested: 3 }],
  ];

  it.each(cases)("%s renders every param in both languages", (code, params) => {
    for (const messages of [en, th]) {
      // คีย์มาจากตาราง cases ไม่ใช่ literal — ปลด type ของ translator ให้รับ string
      const t = createTranslator({
        locale: "en",
        messages,
        namespace: "errors",
      }) as unknown as (key: string, values: typeof params) => string;
      const text = t(`byCode.${code}`, params);
      for (const value of Object.values(params)) {
        expect(text).toContain(String(value));
      }
      expect(text).not.toMatch(/[{}]/);
    }
  });
});
