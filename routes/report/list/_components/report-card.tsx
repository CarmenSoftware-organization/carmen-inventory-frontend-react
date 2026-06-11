import { ArrowUpRight, FileText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Report } from "@/types/report";

interface ReportCardProps {
  readonly item: Report;
  readonly onSelect: (item: Report) => void;
}

/**
 * Premium ERP-style card สำหรับ Report template
 *
 * - Glass card + primary-tinted accent bar (เน้นเมื่อ hover)
 * - Icon tile gradient + system badge ตอนเป็น standard template
 * - Hover: lift + glow + ArrowUpRight reveal
 * - Click หรือ Enter/Space → เปิด dialog เลือก parameter
 */
export default function ReportCard({ item, onSelect }: ReportCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        "group border-border/60 bg-card/70 relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all",
        "shadow-[0_0.125rem_0.5rem_-0.25rem_rgba(0,0,0,0.06)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "hover:-translate-y-0.5 hover:shadow-[0_0.625rem_1.5rem_-0.5rem_color-mix(in_oklch,var(--primary),transparent_82%)]",
      )}
    >
      {/* Inner highlight overlay */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 45%)",
        }}
      />

      {/* Left accent bar — widens on hover */}
      <span
        aria-hidden
        className="bg-primary absolute inset-y-2 left-0 w-0.5 rounded-r-full opacity-60 transition-all group-hover:inset-y-0 group-hover:w-1 group-hover:opacity-100"
      />

      {/* Corner glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-0 transition-opacity group-hover:opacity-40"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 70%) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="relative flex items-start gap-3 px-4 pt-4 pb-2.5">
        {/* Icon tile */}
        <div
          className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--primary), transparent 75%) 0%, color-mix(in oklch, var(--primary), transparent 88%) 100%)",
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
          <FileText className="text-primary relative size-4" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="text-foreground line-clamp-2 text-sm leading-tight font-semibold tracking-tight">
              {item.ReportName}
            </h3>
            <ArrowUpRight
              className="text-muted-foreground/60 group-hover:text-primary mt-0.5 size-3.5 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
            <span className="font-medium tracking-wide uppercase">
              {item.ReportGroup}
            </span>
            {item.IsSystem && (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <Badge
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-primary inline-flex items-center gap-0.5 px-1.5 py-0 text-[0.5625rem] font-semibold tracking-wide uppercase"
                >
                  <Sparkles className="size-2" aria-hidden />
                  System
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {item.Description && (
        <div className="border-border/40 relative mt-auto border-t px-4 py-2.5">
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {item.Description}
          </p>
        </div>
      )}
    </div>
  );
}
