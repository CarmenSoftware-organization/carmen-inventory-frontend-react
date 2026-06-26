import { Badge } from "@/components/ui/badge";
import { ModuleTileIcon } from "@/components/ui/module-tile";

interface DocumentListHeaderProps {
  title: string;
  description: string;
  /** จำนวนรายการทั้งหมด — แสดง badge เมื่อ > 0 */
  count: number;
}

/**
 * หัวข้อหน้ารายการเอกสาร procurement ที่ใช้ร่วมกัน (PR / GRN / CN / PO):
 * ไอคอนโมดูล + ชื่อ + badge จำนวนรายการ + คำอธิบาย
 *
 * โครงเหมือนกันทุกโมดูล ต่างแค่ข้อความ (`title`/`description`) กับจำนวน (`count`)
 *
 * @param title - ชื่อหน้า (แปลจาก namespace ของโมดูล)
 * @param description - คำอธิบายใต้ชื่อ
 * @param count - จำนวนรายการทั้งหมด (ซ่อน badge เมื่อเป็น 0)
 */
export function DocumentListHeader({
  title,
  description,
  count,
}: DocumentListHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <ModuleTileIcon />
        <h1 className="text-lg font-semibold">{title}</h1>
        {count > 0 && (
          <Badge variant="secondary" size="sm" className="text-xs tabular-nums">
            {count.toLocaleString()}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
    </div>
  );
}
