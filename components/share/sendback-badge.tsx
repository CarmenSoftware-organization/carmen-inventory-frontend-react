import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { ITEM_HISTORY_STATUS_CONFIG } from "@/constant/item-history";
import { isSentBack } from "@/constant/last-action";
import type { LastAction } from "@/types/last-action";

interface SendBackBadgeProps {
  readonly lastAction?: LastAction | null;
  /** sm สำหรับตาราง · xs สำหรับการ์ดใน grid view */
  readonly size?: "xs" | "sm";
}

/**
 * ป้าย "ส่งกลับ" ของเอกสารที่ค้างอยู่ในสถานะถูกตีกลับ (PR / PO / SR)
 *
 * คืน `null` เมื่อ action ล่าสุดไม่ใช่การตีกลับ — คนเรียกจึงวางไว้ได้เลยโดยไม่ต้อง
 * เช็กเงื่อนไขเอง ใช้ชิปสีเดียวกับ status `review` ในไทม์ไลน์ประวัติรายบรรทัด
 * เพื่อให้คนอ่านโยงสองที่เข้าด้วยกันได้
 *
 * @param props.lastAction - อ็อบเจกต์ last_action จาก list/detail endpoint
 * @param props.size - ขนาด Badge (default `sm`)
 * @returns Badge หรือ null
 * @example
 * ```tsx
 * <SendBackBadge lastAction={item.last_action} size="xs" />
 * ```
 */
export function SendBackBadge({ lastAction, size = "sm" }: SendBackBadgeProps) {
  const tc = useTranslations("common");

  if (!isSentBack(lastAction)) return null;

  return (
    <Badge
      size={size}
      className={ITEM_HISTORY_STATUS_CONFIG.send_back.className}
    >
      {tc("sendBack")}
    </Badge>
  );
}
