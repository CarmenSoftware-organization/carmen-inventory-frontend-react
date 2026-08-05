import { Files, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** มุมมองของ list ที่มีคิวอนุมัติ — ของฉันที่ยังค้าง หรือทั้งหมด */
export type ListViewMode = "my-pending" | "all-document";

interface ViewModeToggleProps {
  readonly value: ListViewMode;
  readonly onChange: (next: ListViewMode) => void;
  /** ข้อความปุ่มมาจาก namespace ของแต่ละโมดูล (`t("myPending")`) */
  readonly myPendingLabel: string;
  readonly allDocumentsLabel: string;
  /**
   * ผังของ toolbar แต่ละหน้าไม่เหมือนกัน — desktop เป็นแถวที่ซ่อนบนจอแคบ
   * (`hidden sm:flex`) ส่วนในชีตมือถือเป็นสองคอลัมน์เต็มความกว้าง
   * (`grid grid-cols-2`) เลยปล่อยให้ call site สั่งเอง ไม่ทำเป็น variant
   */
  readonly className?: string;
}

/**
 * ปุ่มสลับ "รอดำเนินการของฉัน / เอกสารทั้งหมด"
 *
 * ใช้ที่ PR · PO · SR หน้าละสองที่ (toolbar บนจอกว้าง + ในชีตกรองบนมือถือ) —
 * สามโมดูลนี้คือทั้งหมดที่เดินผ่านลำดับขั้นอนุมัติ GRN/CN บันทึกแล้วจบจึงไม่มี
 *
 * @example
 * ```tsx
 * <ViewModeToggle
 *   value={viewMode}
 *   onChange={setViewMode}
 *   myPendingLabel={t("myPending")}
 *   allDocumentsLabel={t("allDocuments")}
 *   className="hidden sm:flex"
 * />
 * ```
 */
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
