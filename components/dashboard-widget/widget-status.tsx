import { useTranslations } from "use-intl";
import type { WidgetParams } from "@/types/dashboard-widget";
import { statusMeta, statusOf } from "./status-meta";

/**
 * ไอคอนหลักของ tile แบบ custom ตาม document state (workflow status) — ใช้แทน
 * SubTile รูปเอกสารเดิมสำหรับ widget กลุ่ม document.* ที่กรองด้วย status. สี icon +
 * bg จางมาจาก `var(--status-*)` (ชุดเดียวกับ badge สถานะทั้งแอป). ทรงโค้งเข้าชุดกับ
 * SubTile (rounded-lg) เพื่อให้ layout เดิมไม่ขยับ.
 */
export function StatusTile({
  status,
  size = 32,
}: {
  readonly status: string;
  readonly size?: number;
}) {
  const { Icon, cssVar } = statusMeta(status);
  const icon = Math.round(size * 0.55);
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        color: `var(${cssVar})`,
        backgroundColor: `color-mix(in oklab, var(${cssVar}) 14%, transparent)`,
      }}
    >
      <Icon style={{ width: icon, height: icon }} />
    </span>
  );
}

/**
 * แถบสรุป param ใต้ชื่อ tile — status เป็น label สี(canonical, ไอคอนไปอยู่ที่
 * StatusTile ตัวหลักแล้ว จึงไม่ซ้ำ) + ช่วงเวลา. อ่านจาก widget.params ล้วน ไม่รู้จัก
 * ชื่อ param เฉพาะตัว: "@today"→time range, ที่เหลือ→status.
 */
export function WidgetParamsBadges({
  params,
}: {
  readonly params?: WidgetParams | null;
}) {
  const tStatus = useTranslations("status");
  const tRange = useTranslations("dashboard.savedWidget.timeRange");

  const status = statusOf(params);
  const range =
    typeof params?.time_range === "string" && params.time_range
      ? params.time_range
      : null;
  if (!status && !range) return null;

  const rangeKey = range?.replace(/^@/, "");

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {status && (
        <span
          className="text-[0.625rem] font-semibold"
          style={{ color: `var(${statusMeta(status).cssVar})` }}
        >
          {tStatus.has(status) ? tStatus(status) : status}
        </span>
      )}
      {range && (
        <span className="text-muted-foreground bg-muted inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.625rem] font-medium">
          {rangeKey && tRange.has(rangeKey) ? tRange(rangeKey) : range}
        </span>
      )}
    </div>
  );
}
