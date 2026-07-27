import { X } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusDotBadge, type DotTone } from "@/components/ui/status-dot-badge";
import { cn } from "@/lib/utils";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { normalizeItemStatus } from "./pr2-use-rows";

/** สถานะที่ล้างกลับเป็น "รอ" ได้ — ตรงกับ StatusCell ของหน้าเดิม */
const RESETTABLE = new Set<string>([
  PR_ITEM_STAGE_STATUS.APPROVED,
  PR_ITEM_STAGE_STATUS.REJECTED,
  PR_ITEM_STAGE_STATUS.REVIEW,
]);

/**
 * ใช้ `StatusDotBadge` ตัวเดียวกับทั้งแอป — chip สีกลาง + จุดสีนำหน้า
 *
 * เคยทำเป็นไอคอน+คำที่ย้อมสีทั้ง chip เอง แล้วมันกลายเป็นสถานะที่หน้าเดียวใน
 * ระบบแสดงไม่เหมือนที่อื่น · จุดสีอิง semantic tone เดียวกับหน้าเดิม
 * (`status-cell.tsx`): รอ = info, อนุมัติ = success, ปฏิเสธ = destructive,
 * ส่งกลับ = warning
 */
const TONE: Record<string, DotTone> = {
  pending: "info",
  approved: "success",
  rejected: "destructive",
  review: "warning",
};

export function Pr2StatusPill({
  status,
  initialStatus,
  canEdit,
  onReset,
  className,
}: {
  readonly status: string;
  /** สถานะตอนโหลดจาก server — ถ้าตัดสินไปแล้วห้ามล้าง (กติกาเดียวกับหน้าเดิม) */
  readonly initialStatus?: string;
  readonly canEdit?: boolean;
  readonly onReset?: () => void;
  readonly className?: string;
}) {
  const t = useTranslations("procurement.purchaseRequest.v2");
  // สถานะที่ไม่รู้จัก (เช่น รายการที่เพิ่งเพิ่ม ยังเป็นสตริงว่าง) ให้ตกมาที่ "รอ"
  // ทั้งไอคอนและคำ — ไม่งั้น t() หา key ไม่เจอแล้วโชว์ path ดิบให้คนใช้เห็น
  const raw = normalizeItemStatus(status);
  const normalized = raw in TONE ? raw : PR_ITEM_STAGE_STATUS.PENDING;

  const initialNormalized = normalizeItemStatus(initialStatus ?? "");
  const lockedFromServer =
    initialNormalized === PR_ITEM_STAGE_STATUS.APPROVED ||
    initialNormalized === PR_ITEM_STAGE_STATUS.REJECTED;
  const showReset =
    !!canEdit && !!onReset && !lockedFromServer && RESETTABLE.has(normalized);

  return (
    <StatusDotBadge
      tone={TONE[normalized] ?? "neutral"}
      size="sm"
      className={cn("whitespace-nowrap", className)}
    >
      {t(`itemStatus.${normalized}` as "itemStatus.pending")}
      {showReset && (
        <button
          type="button"
          onClick={onReset}
          aria-label={t("resetStatus")}
          title={t("resetStatus")}
          className="hover:bg-foreground/10 -mr-0.5 ml-0.5 rounded p-0.5 focus-visible:outline-none"
        >
          <X className="size-2.5" />
        </button>
      )}
    </StatusDotBadge>
  );
}
