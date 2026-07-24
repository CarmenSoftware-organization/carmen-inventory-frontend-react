import type { UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductLabels } from "./plt-form-labels";
import type { PltFormValues } from "./plt-form-schema";
import {
  NoteCell,
  QtyCell,
  UnitCell,
  type DetailField,
} from "./plt-product-cells";

interface PltProductCardsProps {
  readonly form: UseFormReturn<PltFormValues>;
  readonly detailFields: DetailField[];
  readonly isDisabled: boolean;
  readonly onRemoveTier: (idx: number) => void;
  readonly onAddTier: (productId: string) => void;
  readonly onRemoveProduct: (productId: string) => void;
  readonly getProductName: (productId: string) => string;
  readonly getOrderUnitName: (productId: string) => string;
  readonly labels: ProductLabels;
}

/**
 * รายการ product ตอน edit/add แบบการ์ด ใครการ์ดมัน — 1 การ์ด = 1 product
 * ข้างในเป็นลิสต์ MOQ tier (unit + qty + note) เพิ่ม/ลบทีละ tier ได้
 * (product มาจาก tree ซ้ายมือ · การ์ดจึงโชว์แค่ชื่อ ไม่มี combobox)
 *
 * detail ยังเป็น flat array — group ตาม product_id ตอน render เท่านั้น
 * key ด้วย field.id (ไม่ใช่ index) กัน lookup ค้างค่าเก่าเวลา add/remove
 */
export function PltProductCards({
  form,
  detailFields,
  isDisabled,
  onRemoveTier,
  onAddTier,
  onRemoveProduct,
  getProductName,
  getOrderUnitName,
  labels,
}: PltProductCardsProps) {
  "use no memo";

  // group detail แบนๆ เป็นก้อนตาม product_id (คงลำดับที่เจอครั้งแรก)
  const groups: { productId: string; tiers: { id: string; index: number }[] }[] =
    [];
  const groupIndexById = new Map<string, number>();
  detailFields.forEach((field, index) => {
    const pid = field.product_id;
    let gi = groupIndexById.get(pid);
    if (gi === undefined) {
      gi = groups.length;
      groupIndexById.set(pid, gi);
      groups.push({ productId: pid, tiers: [] });
    }
    groups[gi].tiers.push({ id: field.id, index });
  });

  return (
    <div className="space-y-2.5">
      {groups.map((g) => (
        <div
          key={g.productId}
          className="border-border rounded-lg border p-2.5 shadow-xs"
        >
          {/* header — ชื่อ product + หน่วยสั่งซื้อ + ลบทั้ง product */}
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {getProductName(g.productId)}
            </span>
            {getOrderUnitName(g.productId) && (
              <Badge variant="secondary" size="xs" className="shrink-0 gap-1">
                <span className="text-muted-foreground font-normal">
                  {labels.orderUnit}
                </span>
                {getOrderUnitName(g.productId)}
              </Badge>
            )}
            {!isDisabled && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={labels.removeProduct}
                onClick={() => onRemoveProduct(g.productId)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-full"
              >
                <Trash2 />
              </Button>
            )}
          </div>

          {/* MOQ tiers */}
          <div className="mt-2 space-y-1.5">
            {/* column labels — แถวเดียว จัดตรงกับ input ข้างล่าง */}
            <div className="text-muted-foreground flex items-center gap-1.5 px-0.5 text-[10px] font-medium tracking-wide uppercase">
              <span className="w-16 shrink-0 text-right">{labels.qty}</span>
              <span className="w-24 shrink-0">{labels.unit}</span>
              <span className="min-w-0 flex-1">{labels.note}</span>
              {g.tiers.length > 1 && <span className="w-6 shrink-0" />}
            </div>
            {g.tiers.map((tier) => (
              <div key={tier.id} className="flex items-center gap-1.5">
                <div className="w-16 shrink-0">
                  <QtyCell
                    form={form}
                    index={tier.index}
                    isView={false}
                    isDisabled={isDisabled}
                  />
                </div>
                <div className="w-24 shrink-0">
                  <UnitCell
                    form={form}
                    index={tier.index}
                    isView={false}
                    isDisabled={isDisabled}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <NoteCell
                    form={form}
                    index={tier.index}
                    isView={false}
                    isDisabled={isDisabled}
                    placeholder={labels.notePlaceholder}
                  />
                </div>
                {!isDisabled && g.tiers.length > 1 && (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={labels.removeTier}
                    onClick={() => onRemoveTier(tier.index)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-full"
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* add MOQ tier */}
          {!isDisabled && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => onAddTier(g.productId)}
              className="text-muted-foreground mt-1.5 h-7"
            >
              <Plus />
              {labels.addTier}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
