import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** สีของ dot ตามความหมายของสถานะ (semantic tone) — chip เป็นสีกลางเสมอ */
export type DotTone =
  | "success"
  | "info"
  | "warning"
  | "destructive"
  | "neutral";

const TONE_DOT: Record<DotTone, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/50",
};

interface StatusDotBadgeProps {
  /** ความหมายของสถานะ → สีของ dot */
  readonly tone: DotTone;
  /** ขนาด badge — `"sm"` list/grid, `"xs"` หัวฟอร์มกระชับ, `"lg"` table cell */
  readonly size?: "xs" | "sm" | "lg";
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Status badge มาตรฐานของทั้งแอป — chip กลาง (`secondary`) + **dot สี** นำหน้า
 * label โดย label เป็นสีกลาง สีอยู่ที่ dot อย่างเดียว (DESIGN.md "avoid neon":
 * สัญญาณสีเดียว ไม่ย้อมทั้ง chip) ใช้ร่วมทุก entity/ทุก view (list/grid/form) เพื่อ
 * ไม่ให้สถานะแสดงต่างกันเมื่อสลับมุมมอง — สีของ dot ผูกกับ semantic tone ไม่ใช่
 * status string ตรง ๆ จึง reuse ข้าม domain ได้ (แต่ละ domain map status → tone เอง)
 *
 * @example
 * <StatusDotBadge tone="success">Active</StatusDotBadge>
 */
export function StatusDotBadge({
  tone,
  size = "sm",
  className,
  children,
}: StatusDotBadgeProps) {
  return (
    <Badge
      variant="secondary"
      size={size}
      className={cn("font-normal", className)}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])}
        aria-hidden="true"
      />
      {children}
    </Badge>
  );
}
