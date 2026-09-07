import { memo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { useProductById } from "@/hooks/use-product";
import type { GrnFormValues } from "../grn-form-schema";

/** หน่วยนับของสินค้า (มาจาก master ไม่ใช่หน่วยที่รับ) — โชว์อย่างเดียว */
export const ProductUnitCell = memo(function ProductUnitCell({
  control,
  index,
}: {
  control: Control<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const productId = useWatch({ control, name: `items.${index}.product_id` });
  const { data: product } = useProductById(productId || undefined);
  return (
    <span className="text-muted-foreground text-xs">
      {product?.inventory_unit?.name || "—"}
    </span>
  );
});
