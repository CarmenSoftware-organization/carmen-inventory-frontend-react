import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderForm } from "@/lib/test-utils/form-characterization";
import {
  EMPTY_DETAIL,
  createGrnSchema,
  type GrnFormValues,
} from "./grn-form-schema";

/**
 * 1 แถว = 1 บรรทัดของเอกสาร ราคาจึงเป็นของแถว ไม่ใช่ของสินค้า
 *
 * เทสต์นี้แทนของเดิมที่ปักไว้ว่า "กรอกราคาครั้งเดียว ทุกคลังในกลุ่มได้เท่ากัน" —
 * กติกานั้นตายไปพร้อมการจัดกลุ่มสินค้า ของเดิมที่รับสินค้าตัวเดียวกันสองคลังต้อง
 * ใช้ราคาเดียวกันเสมอ ตอนนี้ต่อรองราคาต่างกันรายบรรทัดได้
 *
 * **ที่เทสต์นี้จับไม่ได้:** โฟกัสหลุดกลางที่พิมพ์ — vitest ไม่ได้รัน
 * `babel-plugin-react-compiler` ที่ `vite.config.ts` เปิดไว้ พฤติกรรม memo
 * ในเทสต์จึงไม่เหมือนของจริง เรื่องโฟกัสต้องกดดูในเบราว์เซอร์เท่านั้น
 */

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    defaultBu: { config: { default_currency: { decimal_places: 2 } } },
    data: undefined,
    defaultCurrencyId: "",
    defaultCurrencyCode: "",
  }),
}));

vi.mock("@/hooks/use-product-units", () => ({
  useProductUnits: () => ({ data: [] }),
  useUnitDecimals: () => 2,
}));

vi.mock("@/hooks/use-product", () => ({
  useProductById: () => ({ data: undefined }),
  useProduct: () => ({ data: undefined, isLoading: false }),
}));

// ตัด combo ส่วนลด/ภาษีออกจากจอ — มันมีช่องกรอกตัวเลขของตัวเอง ทำให้หา "ช่องราคา
// ของแถวนี้" ไม่ได้ ส่วนที่เทสต์นี้สนใจคือราคากับยอดที่คำนวณจากราคาเท่านั้น
vi.mock("../shared/discount-tax-override", () => ({
  OverrideToggle: () => null,
  DiscountOverrideInput: () => null,
  TaxOverrideInput: () => null,
}));

const { GrnItemTable } = await import("./grn-item-table");

const itemRow = (suffix: string, qty: number) => ({
  ...EMPTY_DETAIL,
  product_id: "prod-1",
  product_name: "Sugar",
  location_id: `loc-${suffix}`,
  location_name: `Location ${suffix}`,
  received_qty: qty,
  unit_price: 0,
});

function Harness() {
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const form = useForm<GrnFormValues>({
    resolver: zodResolver(createGrnSchema(tv, tfl)) as Resolver<GrnFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      doc_type: "manual",
      items: [itemRow("a", 5), itemRow("b", 3)],
      extra_cost_details: [],
    } as unknown as GrnFormValues,
  });
  return (
    <TooltipProvider>
      <GrnItemTable form={form} disabled={false} />
    </TooltipProvider>
  );
}

/** แถวข้อมูลของตาราง (ตัดแถวหัวคอลัมน์ออก) */
function dataRows() {
  return screen
    .getAllByRole("row")
    .filter((row) => within(row).queryAllByRole("textbox").length > 0);
}

/** ช่องราคาของแถวนั้น — InputAmount ตัวเดียวที่เหลือในแถว (inputMode decimal) */
function priceInputIn(row: HTMLElement) {
  return within(row)
    .getAllByRole("textbox")
    .find(
      (el) => (el as HTMLInputElement).inputMode === "decimal",
    ) as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ราคาต่อหน่วยรายแถว", () => {
  it("ทุกแถวมีช่องราคาของตัวเอง", () => {
    renderForm(<Harness />);
    const rows = dataRows();
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(priceInputIn(row)).toBeTruthy();
  });

  it("กรอกราคาที่แถวหนึ่ง ไม่ไปเปลี่ยนอีกแถว", async () => {
    const user = userEvent.setup();
    renderForm(<Harness />);

    const [first, second] = dataRows();
    await user.click(priceInputIn(first));
    await user.type(priceInputIn(first), "25");

    // 25 × 5 = 125 (subtotal/net/amount ของแถวแรกเท่ากันหมดเพราะไม่มีส่วนลด/ภาษี)
    expect(within(first).getAllByText("125.00").length).toBeGreaterThan(0);
    expect(within(second).queryByText("75.00")).toBeNull();
    expect(priceInputIn(second)).toHaveValue("0.00");
  });
});

describe("สินค้าตัวเดียวกันเข้าสองคลัง", () => {
  it("ได้สองแถวในตาราง ไม่ยุบเป็นแถวเดียวแล้วต้องกางดู", () => {
    renderForm(<Harness />);

    // ทั้งสองแถวเป็นสินค้าเดียวกัน (Sugar) ต่างกันแค่คลัง — ตอนที่ตารางยังจัดกลุ่ม
    // ด้วย product_id สองแถวนี้จะยุบเหลือแถวเดียว แล้วคลังที่สองหายไปจากสายตา
    // จนกว่าจะกางกลุ่ม (เคสจริง: GRN260900005 รับกระเจี๊ยบเข้าสองคลัง)
    // แถวที่กรอกเองยังไม่ผูก PO → ชื่อสินค้าอยู่ในปุ่มเลือกสินค้า ไม่ใช่ตัวหนังสือ
    // จึงนับจากจำนวนแถวที่มีช่องกรอก ไม่ใช่จากชื่อสินค้าที่ซ้ำกัน
    expect(dataRows()).toHaveLength(2);
  });

  it("ไม่มีปุ่มกางกลุ่มเหลืออยู่", () => {
    renderForm(<Harness />);
    expect(screen.queryByLabelText(/expand/i)).toBeNull();
  });
});
