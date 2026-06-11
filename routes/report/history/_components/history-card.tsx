import { ArrowUpRight, FileText, Rows3 } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  JOB_STATUS_CONFIG,
  REPORT_FORMAT_LABELS,
  normalizeJobStatus,
} from "@/constant/report-history";
import { cn } from "@/lib/utils";
import type {
  ReportFormatRaw,
  ReportHistory,
  ReportStatus,
} from "@/types/report-history";

interface HistoryCardProps {
  readonly item: ReportHistory;
}

/** สี CSS var ต่อสถานะ — ใช้กับ accent bar + icon tile gradient */
const STATUS_COLOR: Record<ReportStatus, string> = {
  queued: "var(--status-pending)",
  processing: "var(--status-in-progress)",
  completed: "var(--status-completed)",
  failed: "var(--destructive)",
  cancelled: "var(--status-cancelled)",
};

/**
 * Premium ERP-style card สำหรับ report history job
 *
 * - Glass card + tinted shadow + inner highlight overlay
 * - Left accent bar สีตามสถานะ
 * - Icon tile gradient ตามสถานะ
 * - Hover: lift + glow shadow + accent bar widen + ext-link reveal
 * - Click เปิด `file_url` ในแท็บใหม่ (เฉพาะเมื่อมี url)
 */
export default function HistoryCard({ item }: HistoryCardProps) {
  const t = useTranslations("reportHistory");

  const statusKey = normalizeJobStatus(item.status);
  const statusConfig = statusKey ? JOB_STATUS_CONFIG[statusKey] : null;
  const accent = statusKey
    ? STATUS_COLOR[statusKey]
    : "var(--muted-foreground)";
  const formatLabel =
    REPORT_FORMAT_LABELS[item.format as ReportFormatRaw] ?? item.format;
  const name = item.file_name ?? item.report_type;
  const hasUrl = !!item.file_url;

  const open = () => {
    if (item.file_url) {
      globalThis.window.open(item.file_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      role={hasUrl ? "button" : undefined}
      tabIndex={hasUrl ? 0 : undefined}
      onClick={hasUrl ? open : undefined}
      onKeyDown={
        hasUrl
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }
          : undefined
      }
      className={cn(
        "group border-border/60 bg-card/70 relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all",
        "shadow-[0_0.125rem_0.5rem_-0.25rem_rgba(0,0,0,0.06)]",
        "focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
        hasUrl &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_0.625rem_1.5rem_-0.5rem_color-mix(in_oklch,var(--primary),transparent_82%)]",
      )}
    >
      {/* Inner highlight overlay (top-left sheen) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 45%)",
        }}
      />

      {/* Status accent bar — widens on hover */}
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-0.5 rounded-r-full opacity-70 transition-all group-hover:inset-y-0 group-hover:w-1 group-hover:opacity-100"
        style={{ backgroundColor: accent }}
      />

      {/* Corner accent glow (top-right, status-tinted) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-0 transition-opacity group-hover:opacity-40"
        style={{
          background: `radial-gradient(circle, color-mix(in oklch, ${accent}, transparent 70%) 0%, transparent 70%)`,
        }}
      />

      {/* Header — icon tile + title */}
      <div className="relative flex items-start gap-3 px-4 pt-4 pb-2.5">
        {/* Icon tile — gradient per status */}
        <div
          className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklch, ${accent}, transparent 75%) 0%, color-mix(in oklch, ${accent}, transparent 88%) 100%)`,
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)",
            }}
          />
          <FileText
            className="relative size-4"
            style={{ color: accent }}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="text-foreground truncate text-sm font-semibold tracking-tight">
              {name}
            </h3>
            {hasUrl && (
              <ArrowUpRight
                className="text-muted-foreground/60 group-hover:text-primary mt-0.5 size-3.5 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                aria-hidden
              />
            )}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[0.6875rem]">
            <span className="font-medium tracking-wide uppercase">
              {item.report_type}
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>{formatLabel}</span>
          </div>
        </div>
      </div>

      {/* Footer — rows + status pill */}
      <div className="border-border/40 relative mt-auto flex items-center justify-between gap-2 border-t px-4 py-2.5">
        <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[0.6875rem]">
          {item.row_count != null ? (
            <>
              <Rows3 className="size-3" aria-hidden />
              <span className="tabular-nums">
                {item.row_count.toLocaleString()}
              </span>
              <span>{t("rowCount").toLowerCase()}</span>
            </>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </div>

        {statusConfig && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold",
              statusConfig.className,
            )}
          >
            <span
              aria-hidden
              className="size-1 rounded-full bg-current opacity-80"
            />
            {t(statusKey!)}
          </div>
        )}
      </div>
    </div>
  );
}
