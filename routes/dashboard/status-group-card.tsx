import { Fragment, useMemo } from "react";
import { ChevronRight, Trash2, User, Users } from "lucide-react";
import { useTranslations } from "use-intl";
import { statusMeta } from "@/components/dashboard-widget/status-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FieldSelect } from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { useDashboardDatasetPreview } from "@/hooks/use-dashboard-dataset";
import { TIME_RANGE_OPTIONS } from "./status-group";

/** dataset by-status ของ doc เดียวกัน (document.pr-count → document.pr-by-status) —
 * ตัวนี้ GROUP BY status คืนทุกสถานะใน call เดียว จึงไม่ต้อง loop ยิงทีละสถานะ */
function byStatusDatasetId(countDatasetId: string): string {
  return countDatasetId.replace(/-count$/, "-by-status");
}

/**
 * tile ลูก 1 ใบ = 1 pipeline stage (pure — ไม่ยิง API เอง): icon ใหญ่ (สูงเท่า
 * label+เลข) ซ้าย + label(สี status) กับตัวเลขขวา. ทุกสีอ้าง `var(--status-*)` +
 * token `bg-card/muted/foreground` → theme-aware ทั้ง light/dark.
 */
function StatusFlowTile({
  status,
  value,
  loading,
}: {
  readonly status: string;
  readonly value: number;
  readonly loading?: boolean;
}) {
  const t = useTranslations("status");
  const { Icon, cssVar } = statusMeta(status);
  const label = t.has(status) ? t(status) : status;

  return (
    <div className="bg-card flex min-w-[6.5rem] flex-1 items-center gap-3 rounded-xl border p-3">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-lg"
        style={{
          color: `var(${cssVar})`,
          backgroundColor: `color-mix(in oklab, var(${cssVar}) 14%, transparent)`,
        }}
      >
        <Icon className="size-7" />
      </span>
      <div className="min-w-0">
        <div
          className="truncate text-micro font-semibold tracking-wide uppercase"
          style={{ color: `var(${cssVar})` }}
        >
          {label}
        </div>
        {loading ? (
          <div className="bg-muted mt-1 h-8 w-12 animate-pulse rounded" />
        ) : (
          <div className="text-foreground text-3xl leading-tight font-bold tabular-nums">
            {value.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Group widget — tile แม่มี header (title h3 + dropdown ช่วงเวลามุมขวา) + tile ลูก
 * เรียงกันเป็น pipeline (1 สถานะ/ใบ) คั่นด้วย chevron แสดงเส้นทางเอกสาร.
 *
 * ยิง **1 call** ที่ tile แม่ผ่าน dataset `by-status` (GROUP BY status → ทุกสถานะ
 * ในครั้งเดียว) แล้วแจกค่าให้ลูก — ไม่ loop ยิงทีละสถานะ. reuse ได้ทุก doc type
 * ผ่าน datasetId (`document.{pr,po,sr,grn}-count`) + statuses.
 */
export function StatusGroupCard({
  title,
  datasetId,
  statuses,
  timeRange = "@today",
  ownerVisibility = "@everyone",
  onDelete,
  onTimeRangeChange,
}: {
  readonly title: string;
  readonly datasetId: string;
  readonly statuses: readonly string[];
  readonly timeRange?: string;
  /** @everyone (ทั้งหมด) หรือ @current_user (เอกสารที่ฉันสร้าง) — กรอง count + badge */
  readonly ownerVisibility?: string;
  readonly onDelete?: () => void;
  /** มี = date มุมขวาบนกลายเป็น dropdown ปรับ time_range ได้ (persist ที่ params) */
  readonly onTimeRangeChange?: (value: string) => void;
}) {
  const t = useTranslations("dashboard.savedWidget");
  const tRange = useTranslations("dashboard.savedWidget.timeRange");
  const rangeLabelFor = (tok: string) => {
    const k = tok.replace(/^@/, "");
    return tRange.has(k) ? tRange(k) : tok;
  };
  const isMine = ownerVisibility === "@current_user";

  const params = useMemo(
    () => ({ time_range: timeRange, owner_visibility: ownerVisibility }),
    [timeRange, ownerVisibility],
  );
  const { data: detail, isLoading } = useDashboardDatasetPreview(
    byStatusDatasetId(datasetId),
    params,
  );

  // categorical [{label:status, value:count}] → map status → count (สถานะที่ไม่มี
  // แถวในช่วงนั้นจะไม่อยู่ใน response → default 0)
  const counts = useMemo(() => {
    const rows = (detail?.data ?? []) as ReadonlyArray<{
      label: string;
      value: number;
    }>;
    return new Map(rows.map((r) => [r.label, r.value]));
  }, [detail]);

  return (
    <Card className="group/gcard relative gap-3 py-4">
      {onDelete && (
        <div className="absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover/gcard:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            aria-label={t("deleteAria", { title })}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}
      <CardHeader className="px-4 pb-0">
        {/* pr-6 = เว้นที่ให้ปุ่มลบมุมขวาบน ไม่ให้ date ทับ */}
        <div className="flex items-center justify-between gap-2 pr-6">
          <h3 className="text-foreground truncate text-base leading-tight font-semibold">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {/* visibility badge — ทั้งหมด / ของฉัน (child counts ก็กรองตามนี้) */}
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium">
              {isMine ? (
                <User className="size-3.5" aria-hidden="true" />
              ) : (
                <Users className="size-3.5" aria-hidden="true" />
              )}
              {isMine ? t("visMine") : t("visAll")}
            </span>
            {onTimeRangeChange ? (
              <FieldSelect
                value={timeRange}
                onValueChange={onTimeRangeChange}
                size="sm"
                className="w-auto gap-1"
              >
                <SelectContent align="end">
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {rangeLabelFor(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </FieldSelect>
            ) : (
              <span className="text-muted-foreground bg-muted inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium">
                {rangeLabelFor(timeRange)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {statuses.map((s, i) => (
            <Fragment key={s}>
              <StatusFlowTile
                status={s}
                value={counts.get(s) ?? 0}
                loading={isLoading}
              />
              {i < statuses.length - 1 && (
                <ChevronRight
                  className="text-muted-foreground/40 size-5 shrink-0 self-center"
                  aria-hidden="true"
                />
              )}
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
