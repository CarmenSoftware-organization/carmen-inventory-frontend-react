import { type FieldArrayWithId, type UseFormReturn } from "react-hook-form";
import { memo, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { PoInventoryDialog } from "./inventory-dialog-cell";
import { PrSourceButton, type PrSource } from "./pr-source-button";
import type { PoFormValues } from "../po-form-schema";

export const CommentFooterRow = memo(function CommentFooterRow({
  form,
  itemFields,
  item,
  isDisabled,
  placeholder,
  leadingWidth,
  renderLeading,
  prSourcesByDetailId,
}: {
  form: UseFormReturn<PoFormValues>;
  itemFields: FieldArrayWithId<PoFormValues, "items", "id">[];
  item: FieldArrayWithId<PoFormValues, "items", "id">;
  isDisabled: boolean;
  placeholder: string;
  /** ความกว้างคอลัมน์ # (px) — กล่องซ้ายสุดต้องเท่ากันเป๊ะถึงจะตรงแนว */
  leadingWidth: number;
  /** ปุ่มที่ยืนอยู่ในแนวคอลัมน์ # ของแถวนี้ (ปุ่มลบ) — ไม่ส่งมาก็เว้นที่ไว้เฉย ๆ */
  renderLeading?: (index: number) => ReactNode;
  /** id ของแถว PO → ใบขอซื้อต้นทาง (อ่านจาก response ของ GET ไม่ได้อยู่ในฟอร์ม) */
  prSourcesByDetailId: Map<string, PrSource[]>;
}) {
  "use no memo";
  const index = itemFields.findIndex((f) => f.id === item.id);

  if (index === -1) return null;
  // ต้องเอา id จาก **ค่าในฟอร์ม** ไม่ใช่ `item.id` — useFieldArray ทับ `id` ของแถว
  // ด้วย uuid ของตัวเอง (keyName default) เอา `item.id` ไปหาในแมปจะไม่เจอสักแถว
  const detailId = form.getValues(`items.${index}.id`);
  return (
    // pb เท่ากับ py ของเซลล์แถวแม่ (2.5) — `<td>` ของแถวหมายเหตุไม่มี padding
    // ของตัวเอง ช่องไฟด้านล่างจึงต้องมาจากตรงนี้ ไม่งั้นช่องกรอกชนเส้นคั่นแถว
    <div className="flex items-center gap-2 pb-2.5">
      {/* กินที่เท่าคอลัมน์ # พอดี ปุ่มลบจึงอยู่ใต้เลขลำดับของแถวตัวเอง */}
      <div
        className="flex shrink-0 justify-center"
        style={{ width: leadingWidth }}
      >
        {renderLeading?.(index)}
      </div>
      <Input
        id={`items-${index}-comment`}
        placeholder={placeholder}
        maxLength={256}
        className="w-96 text-xs"
        disabled={isDisabled}
        {...form.register(`items.${index}.comment`)}
      />
      <PoInventoryDialog control={form.control} index={index} />
      <PrSourceButton
        sources={detailId ? prSourcesByDetailId.get(detailId) : undefined}
      />
    </div>
  );
});
