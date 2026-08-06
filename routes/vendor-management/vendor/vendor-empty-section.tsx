import { type LucideIcon } from "lucide-react";

/**
 * กล่องว่างของหมวดในฟอร์มผู้ขาย — กรอบประ + ไอคอนในกล่องมน + หัวข้อ + คำอธิบาย
 *
 * ไม่มีปุ่มเพิ่มในกล่อง ปุ่มอยู่ที่หัวหมวดอยู่แล้ว — ปุ่มเดียวกันสองที่บนจอเดียว
 * ไม่ได้ช่วยอะไร (กติกาเดียวกับใบปรับสต๊อก รายการราคา และแท็บหน่วยนับ)
 *
 * เดิมก้อนนี้ถูกเขียนซ้ำอยู่สามที่ (ข้อมูลเพิ่มเติม · ที่อยู่ · ผู้ติดต่อ) ต่างกัน
 * แค่ไอคอน ส่วนใบรับรองเป็นกล่องข้อความเปล่า ๆ ไม่มีไอคอนเลย ทั้งที่อยู่หน้า
 * เดียวกันและเป็นเรื่องเดียวกัน — รวมมาที่นี่ให้ทั้งสี่หมวดหน้าตาเหมือนกัน
 */
export function VendorEmptySection({
  icon: Icon,
  title,
  description,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="border-border/60 bg-muted/20 rounded-xl border border-dashed p-6 text-center">
      <div className="bg-muted text-muted-foreground/70 mx-auto mb-2 flex size-9 items-center justify-center rounded-xl">
        <Icon className="size-4" />
      </div>
      <div className="text-foreground text-xs font-semibold">{title}</div>
      <p className="text-muted-foreground text-micro mt-0.5">{description}</p>
    </div>
  );
}
