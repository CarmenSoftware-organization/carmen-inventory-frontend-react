import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { renderForm } from "@/lib/test-utils/form-characterization";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";
import type { AdjFormValues } from "./ia-form-schema";

/**
 * ใบจ่ายออกดูสต๊อก ณ วันที่ของใบ ไม่ใช่ทั้งงวด
 *
 * ล็อตที่รับเข้าวันที่ 29 ต้องไม่ถูกเสนอให้ใบที่ลงวันที่ 28 — ฟอร์มจึงต้องส่งวันที่ของใบไปทั้งตัวประมาณราคา
 * และหน้าต่างดูสต๊อก และเตือนตั้งแต่ตอนกรอกถ้าจำนวนเกินยอดที่ตัดได้ ณ วันนั้น
 */

const DOC_DATE = "2026-07-14T17:00:00.000Z";

const costCalls: unknown[][] = [];
vi.mock("@/hooks/use-product-cost", () => ({
  useProductCostByLocationQty: (...args: unknown[]) => {
    costCalls.push(args);
    return { data: undefined };
  },
}));

let inventory: { available_qty?: number; as_of_date?: string } | undefined;
vi.mock("@/hooks/use-product-inventory", () => ({
  useProductInventory: () => ({ data: inventory }),
}));

const dialogProps: Record<string, unknown>[] = [];
vi.mock("@/components/share/inventory-dialog", () => ({
  InventoryDialog: (props: Record<string, unknown>) => {
    dialogProps.push(props);
    return null;
  },
}));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ buCode: "BU-1" }),
}));
vi.mock("@/components/lookup/lookup-product-in-location", () => ({
  LookupProductInLocation: () => null,
}));

const { AdjItemFields } = await import("./ia-item-fields");

function Harness({
  type,
  qty,
}: {
  readonly type: InventoryAdjustmentType;
  readonly qty: number;
}) {
  const form = useForm<AdjFormValues>({
    defaultValues: {
      description: "",
      doc_status: "draft",
      adjustment_type_id: "type-1",
      date: DOC_DATE,
      location_id: "loc-1",
      items: [
        {
          id: "line-1",
          doc_version: 0,
          product_id: "prod-1",
          product_name: "Sugar",
          product_local_name: "",
          unit_name: "KG",
          qty,
          cost_per_unit: 0,
          total_cost: 0,
          description: "",
        },
      ],
    },
  });
  return <AdjItemFields form={form} disabled={false} adjustmentType={type} />;
}

beforeEach(() => {
  costCalls.length = 0;
  dialogProps.length = 0;
  inventory = { available_qty: 3, as_of_date: "2026-07-15" };
});

describe("AdjItemFields — stock-out reads stock on its own date", () => {
  it("prices and shows stock as of the document date", async () => {
    renderForm(<Harness type="stock-out" qty={2} />);

    await waitFor(() => expect(costCalls.length).toBeGreaterThan(0));
    expect(costCalls.at(-1)).toEqual(["BU-1", "prod-1", "loc-1", 2, DOC_DATE]);
    expect(dialogProps.at(-1)).toEqual(
      expect.objectContaining({ atDate: DOC_DATE }),
    );
  });

  it("warns while typing a quantity above what can be issued that day", async () => {
    renderForm(<Harness type="stock-out" qty={5} />);

    expect(
      await screen.findByText(
        "More than can be issued on 2026-07-15 (3 available)",
      ),
    ).toBeTruthy();
  });

  it("stays quiet when the quantity fits", async () => {
    renderForm(<Harness type="stock-out" qty={3} />);

    await waitFor(() => expect(costCalls.length).toBeGreaterThan(0));
    expect(screen.queryByText(/More than can be issued/)).toBeNull();
  });
});

describe("AdjItemFields — stock-in is not dated", () => {
  it("sends no date and never warns", async () => {
    renderForm(<Harness type="stock-in" qty={5} />);

    await waitFor(() => expect(costCalls.length).toBeGreaterThan(0));
    expect(costCalls.at(-1)?.[4]).toBeUndefined();
    expect(dialogProps.at(-1)?.atDate).toBeUndefined();
    expect(screen.queryByText(/More than can be issued/)).toBeNull();
  });
});
