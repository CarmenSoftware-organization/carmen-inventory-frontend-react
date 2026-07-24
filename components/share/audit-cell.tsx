import { formatDate } from "@/lib/date-utils";
import type { AuditEntry } from "@/types/audit";

interface AuditCellProps {
  readonly entry: AuditEntry | undefined;
  readonly dateTimeFormat: string;
}

/**
 * Cell แสดง audit entry (created/updated) ในตาราง list —
 * วันเวลาจริง (ตาม dateTimeFormat ของ BU) + ชื่อผู้ทำ
 * @param props - entry (audit.created หรือ audit.updated) และ dateTimeFormat ปัจจุบัน
 * @returns React element ของ cell; แสดง "—" เมื่อไม่มีข้อมูล audit
 * @example
 * <AuditCell entry={row.original.audit?.created} dateTimeFormat={dateTimeFormat} />
 */
export function AuditCell({ entry, dateTimeFormat }: AuditCellProps) {
  if (!entry?.at) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <div className="flex flex-col gap-0">
      <span className="text-foreground text-xs">
        {formatDate(entry.at, dateTimeFormat)}
      </span>
      {entry.name && (
        <span className="text-muted-foreground truncate text-[0.6875rem]">
          {entry.name}
        </span>
      )}
    </div>
  );
}
