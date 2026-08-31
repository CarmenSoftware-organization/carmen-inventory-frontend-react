import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Empty state สำหรับ products section — flat neutral (dashed muted border) */
export function EmptyProducts({
  onAdd,
  disabled,
  title,
  description,
  addLabel,
}: {
  /**
   * ไม่ส่ง = ไม่มีปุ่มในกล่องว่าง — ใช้กับ section ที่มีปุ่มเพิ่มอยู่ที่หัวข้ออยู่แล้ว
   * ปุ่มเดียวกันสองที่บนจอเดียวไม่ได้ช่วยอะไร
   */
  readonly onAdd?: () => void;
  readonly disabled: boolean;
  readonly title: string;
  readonly description: string;
  readonly addLabel?: string;
}) {
  return (
    <div className="border-border/60 bg-muted/20 rounded-xl border border-dashed p-6 text-center">
      <div className="bg-muted text-muted-foreground/70 mx-auto mb-2 flex size-9 items-center justify-center rounded-xl">
        <Tag className="size-4" />
      </div>
      <div className="text-foreground text-xs font-semibold">{title}</div>
      <p className="text-muted-foreground text-micro mt-0.5">{description}</p>
      {!disabled && onAdd && (
        <Button type="button" size="xs" onClick={onAdd} className="mt-2">
          <Plus />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
