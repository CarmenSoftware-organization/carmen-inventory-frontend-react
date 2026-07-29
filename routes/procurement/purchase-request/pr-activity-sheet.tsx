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
 * ฟิลด์ที่ไม่เอามาแสดง
 * - updated_at/updated_by_id/doc_version: ขยับทุกครั้งที่บันทึก ไม่ได้บอกว่าผู้ใช้
 *   แก้อะไร (ตรงกับ HOUSEKEEPING_FIELDS ฝั่ง backend ที่ไม่นับใน `has_changes`)
 * - history/workflow_history: JSON ก้อนใหญ่ที่ระบบเขียนเอง อ่านไม่รู้เรื่องใน diff
 *   และประวัติ workflow มีหน้าเฉพาะของมันอยู่แล้ว
 */
const HIDDEN_FIELDS = new Set([
  "updated_at",
  "updated_by_id",
  "doc_version",
  "history",
  "workflow_history",
]);

/** ฟิลด์ที่ใช้เรียกชื่อแถวลูก ไล่ตามลำดับความชัดเจน */
const ROW_NAME_FIELDS = [
  "product_name",
  "product_local_name",
  "name",
  "product_code",
  "location_name",
  "description",
];

/** snake_case → คำอ่านได้ เช่น `pr_status` → `Pr Status` */
function humanize(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * ชื่อตารางลูก → หัวข้อที่ผู้ใช้อ่านรู้เรื่อง เช่น `tb_purchase_request_detail`
 * → `Detail` โดยตัด `tb_` และชื่อเอกสารแม่ที่ซ้ำอยู่ข้างหน้าออก (ผู้ใช้ไม่รู้จัก
 * ชื่อตารางจริง และรู้อยู่แล้วว่ากำลังดูเอกสารใบไหน)
 * @param relation - ชื่อ relation จาก diff
 * @param entityType - entity_type ของ log ใช้ตัดคำนำหน้าที่ซ้ำ
 * @returns หัวข้อของบล็อกตารางลูก
 */
function relationLabel(relation: string, entityType: string): string {
  const parent = entityType.replace(/^tb_/, "");
  const name = relation.replace(/^tb_/, "");
  const stripped = name.startsWith(`${parent}_`)
    ? name.slice(parent.length + 1)
    : name;
  return humanize(stripped || name);
}

/** ค่าจาก snapshot → ข้อความสั้นพอจะอ่านในบรรทัดเดียว */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * ชื่อเรียกแถวลูกให้คนอ่านรู้ว่าเป็นแถวไหน เช่น `#2 · Coffee Beans`
 * diff ของแถวที่ถูกแก้ให้มาแค่ id กับฟิลด์ที่เปลี่ยน จึงต้องหาแถวจริงใน snapshot
 * มาตั้งชื่อ ไม่งั้นผู้ใช้เห็นแค่ตัวเลขที่เปลี่ยนโดยไม่รู้ว่าของรายการไหน
 * @param row - แถวจาก snapshot (undefined ได้ถ้าหาไม่เจอ)
 * @param fallbackId - id ของแถว ใช้เมื่อไม่มีฟิลด์ชื่อให้อ่าน
 * @returns ข้อความสั้นสำหรับหัวแถว
 */
function rowLabelOf(
  row: Record<string, unknown> | undefined,
  fallbackId: string,
): string {
  const sequence = row?.sequence_no;
  const name = ROW_NAME_FIELDS.map((key) => row?.[key]).find(
    (value) => typeof value === "string" && value.trim(),
  );
  const parts: string[] = [];
  if (sequence !== null && sequence !== undefined && sequence !== "")
    parts.push(`#${String(sequence)}`);
  if (name) parts.push(String(name));
  return parts.length ? parts.join(" · ") : fallbackId.slice(0, 8);
}

/** แถวลูกของ relation หนึ่ง จาก snapshot ทั้งก้อน จัดดัชนีด้วย id */
function indexRows(
  snapshot: Record<string, unknown> | null,
  relation: string,
): Map<string, Record<string, unknown>> {
  const rows = snapshot?.[relation];
  const byId = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(rows)) return byId;
  for (const row of rows) {
    if (row && typeof row === "object" && typeof row.id === "string")
      byId.set(row.id, row as Record<string, unknown>);
  }
  return byId;
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
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-2 py-0.5 text-micro">
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

/** แถวที่ถูกเพิ่มหรือลบ — บอกชื่อรายการอย่างเดียว ไม่ต้องกางทุกฟิลด์ */
function RowMarkLine({ mark, label }: { mark: string; label: string }) {
  return (
    <p className="py-0.5 text-micro">
      <span className="text-muted-foreground mr-1">{mark}</span>
      {label}
    </p>
  );
}

/** สรุปสิ่งที่เกิดกับตารางลูกหนึ่งตาราง (เช่น รายการสินค้าของ PR) */
function ChildChangeBlock({
  child,
  label,
  rowsById,
}: {
  child: ActivityChildChange;
  label: string;
  rowsById: Map<string, Record<string, unknown>>;
}) {
  const t = useTranslations("procurement.purchaseRequest");
  const counts = [
    { label: t("activityAdded"), n: child.added.length },
    { label: t("activityRemoved"), n: child.removed.length },
    { label: t("activityUpdated"), n: child.updated.length },
  ].filter((c) => c.n > 0);

  // แถวที่เหลือแต่ฟิลด์ที่ซ่อนอยู่แล้ว = ไม่มีอะไรให้ดู
  const updated = child.updated
    .map((row) => ({
      ...row,
      fields: row.fields.filter((f) => !HIDDEN_FIELDS.has(f.field)),
    }))
    .filter((row) => row.fields.length > 0);

  return (
    <div className="space-y-1">
      <p className="text-micro font-semibold">
        {label}{" "}
        <span className="text-muted-foreground font-normal">
          {counts.map((c) => `${c.label} ${c.n}`).join(" · ")}
        </span>
      </p>

      {child.added.map((row, i) => (
        <RowMarkLine
          key={`added-${String(row.id ?? i)}`}
          mark="+"
          label={rowLabelOf(row, String(row.id ?? ""))}
        />
      ))}

      {child.removed.map((row, i) => (
        <RowMarkLine
          key={`removed-${String(row.id ?? i)}`}
          mark="−"
          label={rowLabelOf(row, String(row.id ?? ""))}
        />
      ))}

      {updated.map((row) => (
        <div key={row.id} className="border-muted border-l-2 pl-2">
          <p className="text-micro font-medium">
            {rowLabelOf(rowsById.get(row.id), row.id)}
          </p>
          {row.fields.map((f) => (
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
      <p className="text-muted-foreground flex items-center gap-2 py-2 text-micro">
        <Loader2 className="size-3 animate-spin" />
      </p>
    );

  if (isError || !data)
    return (
      <p className="text-destructive py-2 text-micro">
        {t("activityLoadError")}
      </p>
    );

  const fields = data.changes.fields.filter((f) => !HIDDEN_FIELDS.has(f.field));

  if (!fields.length && !data.changes.children.length)
    return (
      <p className="text-muted-foreground py-2 text-micro">
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
        <ChildChangeBlock
          key={child.relation}
          child={child}
          label={relationLabel(child.relation, data.entity_type)}
          rowsById={indexRows(data.new_data, child.relation)}
        />
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
                    {/* ไม่แสดง log.description — backend สร้างเป็น
                        "update on tb_purchase_request (uuid)" ซึ่งเผยชื่อตาราง
                        ภายในและไม่ได้บอกอะไรเกินจาก action badge */}
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <Badge
                        size="sm"
                        className={cn(
                          "text-micro-legal",
                          ACTION_CLASS[log.action?.toLowerCase()] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {log.action}
                      </Badge>
                      <span className="text-xs font-medium">
                        {actorNameOf(log)}
                      </span>
                      <span className="text-muted-foreground text-micro">
                        {formatDate(getLogCreatedAt(log), datetimeFormat)}
                      </span>
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
