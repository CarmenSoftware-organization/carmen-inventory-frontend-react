import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
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
 * ราคาต่อหน่วยกรอกที่แถวสินค้าที่เดียว แล้วทุกคลังในกลุ่มต้องได้ราคาเดียวกัน
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

const { GrnItemTable } = await import("./grn-item-table");

const locationItem = (suffix: string, qty: number) => ({
  ...EMPTY_DETAIL,
  _group_key: "group-1",
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
      items: [locationItem("a", 5), locationItem("b", 3)],
      extra_cost_details: [],
    } as unknown as GrnFormValues,
  });
  return (
    <TooltipProvider>
      <GrnItemTable form={form} disabled={false} />
    </TooltipProvider>
  );
}

/** ช่องราคาของกลุ่ม — InputAmount ตัวเดียวในตาราง (inputMode decimal) */
function priceInput() {
  return screen
    .getAllByRole("textbox")
    .find(
      (el) => (el as HTMLInputElement).inputMode === "decimal",
    ) as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ราคาต่อหน่วยบนแถวสินค้า", () => {
  it("กรอกครั้งเดียว ทุกคลังในกลุ่มได้ราคาเดียวกัน", async () => {
    const user = userEvent.setup();
    renderForm(<Harness />);

    await user.click(priceInput());
    await user.type(priceInput(), "25");

    // กางกลุ่มดูแถวคลัง — ราคาที่นั่นเป็นข้อความอย่างเดียว ไม่มีช่องกรอก
    await user.click(screen.getAllByLabelText(/expand/i)[0]);

    const shown = screen.getAllByText("25.00");
    expect(shown.length).toBeGreaterThanOrEqual(2);
  });

  it("เพิ่มคลังใหม่แล้วได้ราคาตามกลุ่ม ไม่ใช่ศูนย์", async () => {
    const user = userEvent.setup();
    renderForm(<Harness />);

    await user.click(priceInput());
    await user.type(priceInput(), "25");

    await user.click(screen.getAllByLabelText(/expand/i)[0]);
    await user.click(screen.getByLabelText(/add location/i));

    // เดิม 2 คลัง + ที่เพิ่งเพิ่ม = 3 แถวที่ต้องโชว์ราคาเดียวกัน
    expect(screen.getAllByText("25.00").length).toBeGreaterThanOrEqual(3);
  });
});
