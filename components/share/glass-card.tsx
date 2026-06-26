
import { Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Card container — flat surface, neutral border */
export function GlassCard({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <Card className="bg-card gap-0 rounded-xl px-4 py-3.5">
      {children}
    </Card>
  );
}

/** Uppercase tracking label สำหรับ section header ภายใน GlassCard */
export function CardLabel({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="text-muted-foreground mb-2.5 text-[0.5625rem] font-semibold tracking-[0.14em] uppercase">
      {children}
    </div>
  );
}

/**
 * Plain text fallback สำหรับ view/disabled mode
 * - default: bold text-sm — ใช้กับ entity name (vendor, product, unit ฯลฯ)
 * - multiline: regular text-xs — ใช้กับ description/note ที่อาจหลายบรรทัด
 * - subtitle: บรรทัดที่สอง muted ขนาดเล็กกว่า เช่น "code · category"
 * - empty: italic muted "—"
 */
export function PlainText({
  value,
  subtitle,
  multiline,
}: {
  readonly value?: string | null;
  readonly subtitle?: string | null;
  readonly multiline?: boolean;
}) {
  const empty = !value;
  return (
    <div className="min-h-8 py-1.5">
      <div
        className={cn(
          "text-foreground",
          multiline
            ? "text-xs leading-relaxed whitespace-pre-wrap"
            : "text-sm font-semibold tracking-tight",
          empty && "text-muted-foreground text-xs font-normal italic",
        )}
      >
        {value || "—"}
      </div>
      {subtitle && !empty && (
        <div className="text-muted-foreground mt-0.5 text-[0.6875rem]">
          {subtitle}
        </div>
      )}
    </div>
  );
}

/** Status pill — wrap Badge ด้วย style เดียวกัน รองรับขนาด large/inline */
export function StatusPill({
  statusConfig,
  large,
  inline,
}: {
  readonly statusConfig: { label: string; className: string };
  readonly large?: boolean;
  readonly inline?: boolean;
}) {
  return (
    <Badge
      className={cn(
        statusConfig.className,
        "rounded-full border-transparent font-semibold tracking-widest uppercase",
        large
          ? "px-2 py-0.5 text-[0.625rem]"
          : "px-1.5 py-0.5 text-[0.5625rem]",
        inline && "border-0",
      )}
    >
      <span className="mr-1 size-1 rounded-full bg-current opacity-70" />
      {statusConfig.label}
    </Badge>
  );
}

/** Meta chip ใน hero — pill มี icon + label, ตอน empty ใช้ dashed border */
export function MetaChip({
  icon: Icon,
  label,
  empty,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly empty?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium",
        empty
          ? "border-primary/40 bg-primary/5 text-primary/80 border-dashed italic"
          : "border-border bg-muted text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-2.5",
          empty ? "text-primary" : "text-muted-foreground",
        )}
      />
      {label}
    </div>
  );
}

/** Date input wrapper card — มี calendar icon + label, dashed ตอน empty */
export function DateCard({
  label,
  value,
  highlight,
  children,
}: {
  readonly label: string;
  readonly value?: string;
  readonly highlight?: boolean;
  readonly children: React.ReactNode;
}) {
  const filled = Boolean(value);
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        filled
          ? highlight
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-background"
          : "border-primary/40 border-dashed bg-transparent",
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center gap-1 text-[0.5625rem] font-semibold tracking-widest uppercase",
          highlight ? "text-primary" : "text-muted-foreground",
        )}
      >
        <CalendarIcon className="size-2.5" />
        {label}
      </div>
      {children}
    </div>
  );
}

/** Key-value row สำหรับ Summary card */
export function InfoRow({
  k,
  v,
  muted,
}: {
  readonly k: string;
  readonly v: React.ReactNode;
  readonly muted?: boolean;
}) {
  const isNode = typeof v === "object" && v !== null;
  return (
    <div className="flex items-center justify-between gap-2 text-[0.6875rem]">
      <span className="text-muted-foreground shrink-0">{k}</span>
      {isNode ? (
        v
      ) : (
        <span
          className={cn(
            "text-right font-medium",
            muted ? "text-muted-foreground/70" : "text-foreground",
          )}
        >
          {v}
        </span>
      )}
    </div>
  );
}
