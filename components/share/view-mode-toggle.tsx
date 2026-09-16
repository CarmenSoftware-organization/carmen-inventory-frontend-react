import { Files, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ListViewMode = "my-pending" | "all-document";

interface ViewModeToggleProps {
  readonly value: ListViewMode;
  readonly onChange: (next: ListViewMode) => void;
  readonly myPendingLabel: string;
  readonly allDocumentsLabel: string;
  /**
   * ผังของ toolbar แต่ละหน้าไม่เหมือนกัน — desktop เป็นแถวที่ซ่อนบนจอแคบ
   * (`hidden sm:flex`) ส่วนในชีตมือถือเป็นสองคอลัมน์เต็มความกว้าง
   * (`grid grid-cols-2`) เลยปล่อยให้ call site สั่งเอง ไม่ทำเป็น variant
   */
  readonly className?: string;
}

export function ViewModeToggle({
  value,
  onChange,
  myPendingLabel,
  allDocumentsLabel,
  className,
}: ViewModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Inbox = ตะกร้าเข้าของฉัน สิ่งที่รอให้ฉันจัดการ — ตรงกว่านาฬิกาซึ่งบอกแค่
          ว่า "รอ" ไม่ได้บอกว่ารอใคร และตรงกว่ารูปคนซึ่งบอกว่าของฉันแต่ไม่บอกว่าค้าง */}
      <Button
        size="sm"
        variant={value === "my-pending" ? "default" : "outline"}
        onClick={() => onChange("my-pending")}
      >
        <Inbox aria-hidden="true" />
        {myPendingLabel}
      </Button>
      {/* Files = เอกสารหลายใบซ้อนกัน ตรงกับ "เอกสารทั้งหมด" ตรงตัว ไม่ใช่ไอคอน
          รายการ (List) ที่แปลว่าวิธีแสดงผล ไม่ใช่ขอบเขตของข้อมูล */}
      <Button
        size="sm"
        variant={value === "all-document" ? "default" : "outline"}
        onClick={() => onChange("all-document")}
      >
        <Files aria-hidden="true" />
        {allDocumentsLabel}
      </Button>
    </div>
  );
}
