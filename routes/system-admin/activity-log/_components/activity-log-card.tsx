import { CalendarDays, User, FileText, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { getLogCreatedAt, type ActivityLog } from "@/types/activity-log";

const ACTION_VARIANT: Record<string, string> = {
  create:
    "bg-[var(--status-approved)] text-[var(--status-approved-fg)] border-transparent",
  update:
    "bg-[var(--status-pending)] text-[var(--status-pending-fg)] border-transparent",
  delete: "bg-destructive text-destructive-foreground border-transparent",
  login:
    "bg-[var(--status-in-progress)] text-[var(--status-in-progress-fg)] border-transparent",
  logout:
    "bg-[var(--status-draft)] text-[var(--status-draft-fg)] border-transparent",
};

/**
 * แปลงข้อความ snake_case เป็น Title Case สำหรับการแสดงผลในการ์ด
 * @param value - ข้อความรูปแบบ snake_case ที่ต้องการแปลง
 * @returns ข้อความในรูปแบบ Title Case
 * @example
 * formatEntityType("purchase_request"); // "Purchase Request"
 */
function formatEntityType(value: string): string {
  if (!value) return "";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface ActivityLogCardProps {
  log: ActivityLog;
  index?: number;
  onClick?: () => void;
}

/**
 * การ์ดแสดงข้อมูล Activity Log สำหรับ grid/mobile view
 * @param props - ข้อมูล log, ลำดับ index และ callback เมื่อคลิก
 * @returns React element ของการ์ด Activity Log
 * @example
 * <ActivityLogCard log={log} index={0} onClick={() => setSelected(log)} />
 */
export function ActivityLogCard({ log, index, onClick }: ActivityLogCardProps) {
  const { dateFormat } = useProfile();

  const actionClass =
    ACTION_VARIANT[log.action?.toLowerCase()] ??
    "bg-muted text-muted-foreground";

  const actorName =
    [log.actor_firstname, log.actor_middlename, log.actor_lastname]
      .filter(Boolean)
      .join(" ") ||
    log.actor_username ||
    "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="bg-card hover:border-primary/30 focus-visible:ring-ring cursor-pointer space-y-2 rounded-lg border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {/* Header: action badge + timestamp */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <Badge size="sm" className={`${actionClass} text-xs`}>
            {log.action}
          </Badge>
        </div>
        <div className="text-muted-foreground flex items-center gap-1">
          <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
          <span className="text-[0.6875rem] tabular-nums">
            {formatDate(getLogCreatedAt(log), `${dateFormat} HH:mm`)}
          </span>
        </div>
      </div>

      {/* Body: key info */}
      <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <User
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate text-xs font-semibold">{actorName}</span>
          {log.actor_username && actorName !== log.actor_username && (
            <span className="text-muted-foreground truncate text-[0.6875rem]">
              ({log.actor_username})
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          <FileText
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <Badge variant="outline" size="sm" className="text-xs font-normal">
            {formatEntityType(log.entity_type)}
          </Badge>
        </div>

        {log.description && (
          <p className="text-muted-foreground line-clamp-2 pl-[1.125rem] text-[0.6875rem]">
            {log.description}
          </p>
        )}
      </div>

      {/* Footer: IP */}
      {log.ip_address && (
        <div className="flex items-center gap-1.5 border-t pt-1">
          <Globe
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="text-muted-foreground text-[0.6875rem]">
            {log.ip_address}
          </span>
        </div>
      )}
    </div>
  );
}
