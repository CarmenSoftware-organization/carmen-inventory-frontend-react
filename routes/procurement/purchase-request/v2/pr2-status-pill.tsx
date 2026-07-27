import { Check, Clock, Eye, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "use-intl";
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
 * สถานะรายการแบบ "ไอคอน + คำ" — ของเดิมเป็นจุดกลมสีล้วนต้องเอาเมาส์ไปจิ้มถึงรู้
 * คนใช้อายุเยอะอ่านคำได้เร็วกว่าจำสีจุด และสีอย่างเดียวไม่ผ่าน a11y อยู่แล้ว
 */
/**
 * สีในตารางเหลือ "สีเดียว" โดยตั้งใจ — ใช้กับสถานะที่เปลี่ยนผลลัพธ์ของบรรทัดเท่านั้น
 *
 * ในสี่สถานะ มีแค่ "ปฏิเสธ" ที่แปลว่าบรรทัดนี้จะไม่ถูกซื้อ อีกสามอันแปลว่ากำลังเดินอยู่
 * หรือเรียบร้อยแล้ว · คนไล่ 100 แถวพลาด "รอ" ไม่เป็นไร (มีตัวกรองให้กด) แต่พลาด
 * "ปฏิเสธ" คืออ่านใบผิดทั้งใบ
 *
 * แยก "รอ" กับ "อนุมัติ" ด้วยความสว่าง ไม่ใช่สี — เสร็จแล้วก็จางลงแล้วถอยไปข้างหลัง
 * (แบบเมลที่อ่านแล้ว) ซึ่งเป็นการไล่ลำดับแบบที่ DESIGN.md ต้องการ: contrast ของ
 * ความสว่าง/ขนาด ไม่ใช่เพิ่ม accent
 *
 * ถ้าอยากได้แบบเงียบสนิท (สีอยู่ที่เส้นทางอนุมัติกับปุ่มเท่านั้น) เปลี่ยน rejected
 * ให้เป็น "text-foreground bg-muted" บรรทัดเดียวจบ
 */
const PILL: Record<string, { icon: LucideIcon; className: string }> = {
  pending: {
    icon: Clock,
    className: "text-foreground bg-muted",
  },
  approved: {
    icon: Check,
    className: "text-muted-foreground",
  },
  rejected: {
    icon: X,
    className: "text-destructive bg-destructive/10",
  },
  review: {
    icon: Eye,
    className: "text-foreground bg-muted",
  },
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
  const normalized = raw in PILL ? raw : PR_ITEM_STAGE_STATUS.PENDING;
  const cfg = PILL[normalized];
  const Icon = cfg.icon;

  const initialNormalized = normalizeItemStatus(initialStatus ?? "");
  const lockedFromServer =
    initialNormalized === PR_ITEM_STAGE_STATUS.APPROVED ||
    initialNormalized === PR_ITEM_STAGE_STATUS.REJECTED;
  const showReset =
    !!canEdit && !!onReset && !lockedFromServer && RESETTABLE.has(normalized);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        cfg.className,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
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
    </span>
  );
}
