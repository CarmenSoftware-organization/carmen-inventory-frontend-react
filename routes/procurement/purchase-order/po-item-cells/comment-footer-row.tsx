import {
  useWatch,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { memo } from "react";
import { Input } from "@/components/ui/input";
import type { PoFormValues } from "../po-form-schema";

/**
 * หมายเหตุรายแถว — แถวใต้รายการสินค้า ตำแหน่งเดียวกับของ PR
 *
 * โหมดอ่านไม่มีช่องกรอก: มีข้อความก็โชว์ในเครื่องหมายคำพูด ไม่มีก็ไม่กินที่เลย
 * (คืน null ให้แถวหมายเหตุยุบหายไปทั้งแถว)
 */
export const CommentFooterRow = memo(function CommentFooterRow({
  form,
  itemFields,
  item,
  isDisabled,
  placeholder,
}: {
  form: UseFormReturn<PoFormValues>;
  itemFields: FieldArrayWithId<PoFormValues, "items", "id">[];
  item: FieldArrayWithId<PoFormValues, "items", "id">;
  isDisabled: boolean;
  placeholder: string;
}) {
  "use no memo";
  // ตำแหน่งจริงของแถว — อ่านจาก id ไม่ใช่ลำดับที่ตารางส่งมา เพราะแถวถูกลบ/เพิ่ม
  // ระหว่างทางได้ (ทรงเดียวกับ PR)
  const index = itemFields.findIndex((f) => f.id === item.id);
  const comment =
    useWatch({
      control: form.control,
      name: `items.${index === -1 ? 0 : index}.comment`,
    }) ?? "";
  if (index === -1) return null;
  if (isDisabled) {
    if (!comment) return null;
    return (
      <div className="px-3 pb-3">
        <p className="text-muted-foreground text-xs wrap-break-word whitespace-pre-wrap italic">
          {`"${comment}"`}
        </p>
      </div>
    );
  }
  return (
    <div className="px-3 pb-3">
      <Input
        id={`items-${index}-comment`}
        placeholder={placeholder}
        maxLength={256}
        className="h-8 text-xs"
        {...form.register(`items.${index}.comment`)}
      />
    </div>
  );
});
