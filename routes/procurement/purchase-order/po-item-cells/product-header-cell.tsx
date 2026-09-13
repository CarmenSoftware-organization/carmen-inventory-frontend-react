import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { InventoryTooltip } from "@/components/share/inventory-tooltip";
import { OnHandDialog } from "@/components/share/on-hand-dialog";
import { OnOrderDialog } from "@/components/share/on-order-dialog";
import { useBuCode } from "@/hooks/use-bu-code";
import type { PoFormValues } from "../po-form-schema";
import { ProductCell } from "./product-cell";
import { StatusCell } from "./status-cell";

/**
 * ยอดคงเหลือ/กำลังสั่งของสินค้าในแถว — ไอคอนที่ hover แล้วกางตัวเลข กดต่อได้
 * อีกชั้นเพื่อดูว่าของอยู่คลังไหน/ติดใบไหน (ทรงเดียวกับ PR และ SR)
 *
 * ยอดผูกกับ **คลังของแถวนั้น** ไม่ใช่ทั้ง BU — คนสั่งซื้ออยากรู้ว่าคลังที่กำลังสั่งเข้า
 * มีของเหลือเท่าไร ไม่ใช่ยอดรวมทั้งโรงแรม · ยังไม่เลือกสินค้า ไอคอนจางและกดไม่ได้
 */
const PoInventoryTooltip = memo(function PoInventoryTooltip({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const buCode = useBuCode();
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.order_unit_name` }) ?? "";
  const [onHandOpen, setOnHandOpen] = useState(false);
  const [onOrderOpen, setOnOrderOpen] = useState(false);

  return (
    <>
      <InventoryTooltip
        buCode={buCode}
        locationId={locationId}
        productId={productId}
        unitName={unitName}
        icon="package"
        className={productId ? "text-primary" : "text-muted-foreground"}
        onOnHandClick={productId ? () => setOnHandOpen(true) : undefined}
        onOnOrderClick={productId ? () => setOnOrderOpen(true) : undefined}
      />
      {productId && (
        <>
          <OnHandDialog
            open={onHandOpen}
            onOpenChange={setOnHandOpen}
            productId={productId}
          />
          <OnOrderDialog
            open={onOrderOpen}
            onOpenChange={setOnOrderOpen}
            productId={productId}
          />
        </>
      )}
    </>
  );
});

interface CellProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

interface ProductHeaderCellProps extends CellProps {
  readonly isFoc: boolean;
  readonly showStatusBadge: boolean;
  /** ผู้อนุมัติในโหมดแก้ไขล้างสถานะรายแถวกลับเป็นรอได้ */
  readonly canResetStatus?: boolean;
}

/**
 * Product cell — name (ProductCell) + FOC/Status badges + local name + code/SKU
 *
 * Font ของทุก line ใช้ inherit จาก parent (`text-xs` บน table) — ไม่ override
 */
export function ProductHeaderCell({
  form,
  index,
  disabled,
  readOnly,
  isFoc,
  showStatusBadge,
  canResetStatus,
}: ProductHeaderCellProps) {
  "use no memo";
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <ProductCell
            control={form.control}
            form={form}
            index={index}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>
        {isFoc && (
          <Badge variant="success-light" size="xs">
            FOC
          </Badge>
        )}
        {showStatusBadge && (
          <StatusCell
            control={form.control}
            form={form}
            index={index}
            canReset={canResetStatus}
          />
        )}
        {/* ปิดท้ายแถว — ป้ายเป็นข้อมูลของแถว ส่วนไอคอนนี้เป็นปุ่ม ไม่เอาไปแทรกกลาง
            ระหว่างชื่อกับป้ายจนอ่านเป็นชุดเดียวกัน */}
        <PoInventoryTooltip control={form.control} index={index} />
      </div>
    </div>
  );
}
