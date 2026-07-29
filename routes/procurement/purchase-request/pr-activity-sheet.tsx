import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActivityLogByRecord,
  useActivityLogDetail,
} from "@/hooks/use-activity-log";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  getLogCreatedAt,
  type ActivityChildChange,
  type ActivityFieldChange,
  type ActivityLog,
} from "@/types/activity-log";

/** สีของ badge action — ใช้ชุด --status-* เดียวกับ activity monitor ของ system admin */
const ACTION_CLASS: Record<string, string> = {
  create:
    "bg-[var(--status-approved)] text-[var(--status-approved-fg)] border-transparent",
  update:
    "bg-[var(--status-pending)] text-[var(--status-pending-fg)] border-transparent",
  delete: "bg-destructive text-destructive-foreground border-transparent",
};

/**
 * ฟิลด์ที่ขยับทุกครั้งที่บันทึกและไม่ได้บอกว่าผู้ใช้แก้อะไร — ตรงกับ
 * HOUSEKEEPING_FIELDS ฝั่ง backend ที่ไม่นับรวมใน `has_changes`
 */
const HOUSEKEEPING_FIELDS = new Set([
  "updated_at",
  "updated_by_id",
  "doc_version",
]);

/** snake_case → คำอ่านได้ เช่น `pr_status` → `Pr Status` */
function humanize(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** ค่าจาก snapshot → ข้อความสั้นพอจะอ่านในบรรทัดเดียว */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** ชื่อเต็มของผู้กระทำ ถ้าไม่มีค่อยตกไปที่ username */
function actorNameOf(log: ActivityLog): string {
  const fullName = [log.actor_firstname, log.actor_middlename, log.actor_lastname]
    .filter(Boolean)
    .join(" ");
  return fullName || log.actor_username || "—";
}

/** แถวเดียวของ field ที่เปลี่ยน: ชื่อฟิลด์ + ค่าเดิม → ค่าใหม่ */
function FieldChangeRow({ change }: { change: ActivityFieldChange }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-2 py-0.5 text-[0.6875rem]">
      <span className="text-muted-foreground truncate" title={change.field}>
        {humanize(change.field)}
      </span>
      <span className="min-w-0 break-words">
        <span className="text-muted-foreground line-through">
          {formatValue(change.old)}
        </span>
        <span className="mx-1">→</span>
        <span className="font-medium">{formatValue(change.new)}</span>
      </span>
    </div>
  );
}

/** สรุปสิ่งที่เกิดกับตารางลูกหนึ่งตาราง (เช่น รายการสินค้าของ PR) */
function ChildChangeBlock({ child }: { child: ActivityChildChange }) {
  const t = useTranslations("procurement.purchaseRequest");
  const counts = [
    { label: t("activityAdded"), n: child.added.length },
    { label: t("activityRemoved"), n: child.removed.length },
    { label: t("activityUpdated"), n: child.updated.length },
  ].filter((c) => c.n > 0);

  return (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-semibold">
        {humanize(child.relation)}{" "}
        <span className="text-muted-foreground font-normal">
          {counts.map((c) => `${c.label} ${c.n}`).join(" · ")}
        </span>
      </p>
      {child.updated.map((row) => (
        <div key={row.id} className="border-muted border-l-2 pl-2">
          {row.fields
            .filter((f) => !HOUSEKEEPING_FIELDS.has(f.field))
            .map((f) => (
              <FieldChangeRow key={f.field} change={f} />
            ))}
        </div>
      ))}
    </div>
  );
}

/** เนื้อหาที่กางออกของ log หนึ่งรายการ — โหลด diff ตอนกางเท่านั้น */
function ActivityChanges({ logId }: { logId: string }) {
  const t = useTranslations("procurement.purchaseRequest");
  const { data, isLoading, isError } = useActivityLogDetail(logId);

  if (isLoading)
    return (
      <p className="text-muted-foreground flex items-center gap-2 py-2 text-[0.6875rem]">
        <Loader2 className="size-3 animate-spin" />
      </p>
    );

  if (isError || !data)
    return (
      <p className="text-destructive py-2 text-[0.6875rem]">
        {t("activityLoadError")}
      </p>
    );

  const fields = data.changes.fields.filter(
    (f) => !HOUSEKEEPING_FIELDS.has(f.field),
  );

  if (!fields.length && !data.changes.children.length)
    return (
      <p className="text-muted-foreground py-2 text-[0.6875rem]">
        {t("activityNoChanges")}
      </p>
    );

  return (
    <div className="space-y-2 py-2">
      {fields.length > 0 && (
        <div>
          {fields.map((f) => (
            <FieldChangeRow key={f.field} change={f} />
          ))}
        </div>
      )}
      {data.changes.children.map((child) => (
        <ChildChangeBlock key={child.relation} child={child} />
      ))}
    </div>
  );
}

interface PrActivitySheetProps {
  readonly prId: string | undefined;
  readonly prNo?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Sheet แสดงประวัติกิจกรรมของใบขอซื้อใบเดียว เรียงล่าสุดขึ้นก่อน แตะที่รายการ
 * เพื่อกางดูว่าฟิลด์ไหนและรายการสินค้าใดเปลี่ยนไป (โหลด diff ตอนกางเท่านั้น
 * เพราะ snapshot ของเอกสารมีขนาดใหญ่) เปิดได้ทีละรายการ
 * @param props - คุณสมบัติของ sheet
 * @param props.prId - รหัสใบขอซื้อที่จะดูประวัติ
 * @param props.prNo - เลขที่เอกสาร ใช้แสดงในคำอธิบายหัว sheet
 * @param props.open - สถานะเปิด/ปิดของ sheet
 * @param props.onOpenChange - callback เมื่อสถานะเปิด/ปิดเปลี่ยน
 * @returns React element ของ activity sheet
 * @example
 * <PrActivitySheet
 *   prId={purchaseRequest?.id}
 *   prNo={purchaseRequest?.pr_no}
 *   open={showActivity}
 *   onOpenChange={setShowActivity}
 * />
 */
export function PrActivitySheet({
  prId,
  prNo,
  open,
  onOpenChange,
}: PrActivitySheetProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const { dateFormat } = useProfile();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // fetch ต่อเมื่อ sheet เปิด — ผู้ใช้ส่วนใหญ่ไม่เคยกดปุ่มนี้
  const { data, isLoading, isError } = useActivityLogByRecord(
    open ? prId : undefined,
    { perpage: 50 },
  );

  // backend เรียงเก่า→ใหม่ แต่คนอ่านอยากเห็นสิ่งที่เพิ่งทำก่อน
  const logs = [...(data?.data ?? [])].reverse();

  const datetimeFormat = dateFormat.includes("HH")
    ? dateFormat
    : `${dateFormat} HH:mm`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-sm">{t("activity")}</SheetTitle>
          <SheetDescription className="text-xs">
            {prNo ? `${prNo} · ${t("activityDesc")}` : t("activityDesc")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-destructive text-xs">{t("activityLoadError")}</p>
          )}

          {!isLoading && !isError && logs.length === 0 && (
            <p className="text-muted-foreground text-xs">{t("activityEmpty")}</p>
          )}

          <div className="divide-border divide-y">
            {logs.map((log) => {
              const isOpen = expandedId === log.id;
              return (
                <Collapsible
                  key={log.id}
                  open={isOpen}
                  onOpenChange={(next) => setExpandedId(next ? log.id : null)}
                >
                  <CollapsibleTrigger className="hover:bg-muted/50 focus-visible:ring-ring flex w-full cursor-pointer items-start gap-2 rounded-md px-1 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none">
                    <ChevronRight
                      className={cn(
                        "text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform",
                        isOpen && "rotate-90",
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          size="sm"
                          className={cn(
                            "text-[0.625rem]",
                            ACTION_CLASS[log.action?.toLowerCase()] ??
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {log.action}
                        </Badge>
                        <span className="text-xs font-medium">
                          {actorNameOf(log)}
                        </span>
                        <span className="text-muted-foreground text-[0.6875rem]">
                          {formatDate(getLogCreatedAt(log), datetimeFormat)}
                        </span>
                      </div>
                      {log.description && (
                        <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                          {log.description}
                        </p>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pr-1 pl-6">
                    {isOpen && <ActivityChanges logId={log.id} />}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
