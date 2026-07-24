import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/relative-time";
import type { PriceListAuditEntry } from "@/types/price-list";

interface PlAuditCellProps {
  readonly entry: PriceListAuditEntry | undefined;
  readonly locale: string;
}

/**
 * Cell แสดง audit entry (created/updated) ในตาราง price list —
 * relative time + ชื่อผู้ทำ พร้อม tooltip วันเวลาเต็ม
 * @param props - entry (audit.created หรือ audit.updated) และ locale ปัจจุบัน
 * @returns React element ของ cell; แสดง "—" เมื่อไม่มีข้อมูล audit
 * @example
 * <PlAuditCell entry={row.original.audit?.created} locale={locale} />
 */
export function PlAuditCell({ entry, locale }: PlAuditCellProps) {
  if (!entry?.at) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const relative = formatRelativeTime(entry.at, locale);
  const absolute = new Date(entry.at).toLocaleString(locale);
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div className="flex flex-col gap-0">
          <span className="text-foreground text-xs">{relative}</span>
          {entry.name && (
            <span className="text-muted-foreground truncate text-[0.6875rem]">
              {entry.name}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {absolute}
        {entry.name && ` · ${entry.name}`}
      </TooltipContent>
    </Tooltip>
  );
}
