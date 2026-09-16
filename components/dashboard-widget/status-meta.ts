import {
  Ban,
  CircleCheckBig,
  CircleDashed,
  CircleX,
  Clock,
  FileText,
  Lock,
  PackageCheck,
  Save,
  Send,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { WidgetParams } from "@/types/dashboard-widget";

export function statusOf(params?: WidgetParams | null): string | null {
  return typeof params?.status === "string" && params.status
    ? params.status
    : null;
}

export interface StatusMeta {
  readonly Icon: LucideIcon;
  readonly cssVar: string;
}

/**
 * document state (status) → icon + สี(canonical). ผูกกับ "สถานะเอกสาร" ไม่ใช่ชนิด
 * เอกสาร จึงใช้ร่วมทุก doc type (PR/PO/SR/GRN). สีอ้าง `var(--status-*)` ชุดเดียว
 * กับที่ `constant/status-config.ts` ใช้กับ badge สถานะทั้งแอป → ไม่ drift.
 * (approved=green, in-progress=olive/warning มาจาก badge-status.css อยู่แล้ว.)
 */
const STATUS_META: Record<string, StatusMeta> = {
  draft: { Icon: FileText, cssVar: "--status-draft" },
  in_progress: { Icon: Settings, cssVar: "--status-in-progress" },
  approved: { Icon: FileText, cssVar: "--status-approved" },
  completed: { Icon: CircleCheckBig, cssVar: "--status-completed" },
  voided: { Icon: CircleX, cssVar: "--status-voided" },
  sent_or_print: { Icon: Send, cssVar: "--status-sent" },
  partial: { Icon: CircleDashed, cssVar: "--status-partial" },
  closed: { Icon: Lock, cssVar: "--status-closed" },
  cancelled: { Icon: Ban, cssVar: "--status-cancelled" },
  saved: { Icon: Save, cssVar: "--status-save" },
  committed: { Icon: PackageCheck, cssVar: "--status-committed" },
  pending: { Icon: Clock, cssVar: "--status-pending" },
};

const FALLBACK: StatusMeta = { Icon: FileText, cssVar: "--muted-foreground" };

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? FALLBACK;
}
