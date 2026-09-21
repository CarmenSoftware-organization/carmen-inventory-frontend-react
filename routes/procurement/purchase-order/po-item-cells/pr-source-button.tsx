import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PurchaseOrder } from "@/types/purchase-order";

export interface PrSource {
  id: string;
  no: string;
}

/**
 * ใบขอซื้อต้นทางของแต่ละแถว จาก response ของ `GET /purchase-orders/{id}`
 *
 * **อ่านจาก response ตรง ๆ ไม่ผ่านฟอร์ม** — เป็นข้อมูลอ่านอย่างเดียวที่ไม่เคยถูก
 * ส่งกลับขึ้นไป ลากเข้า `PoFormValues` จะได้ของแถมคือมันรั่วขึ้น payload ตอน save
 *
 * dedupe ด้วย `pr_id` — หนึ่งใบขอซื้ออาจมีหลายบรรทัดถูกตัดมาอยู่ในแถวเดียวกัน
 * คนอ่านสนใจว่า "มาจากใบไหน" ไม่ใช่ "มาจากกี่บรรทัด"
 *
 * @returns map จาก id ของแถว PO → รายการใบขอซื้อต้นทาง (แถวที่ไม่มีต้นทางไม่ติดมา)
 */
export function buildPrSourceMap(
  purchaseOrder?: PurchaseOrder,
): Map<string, PrSource[]> {
  const map = new Map<string, PrSource[]>();
  for (const detail of purchaseOrder?.purchase_order_detail ?? []) {
    const seen = new Map<string, string>();
    for (const pr of detail.pr_details ?? []) {
      if (!pr.pr_id || seen.has(pr.pr_id)) continue;
      seen.set(pr.pr_id, pr.pr_no ?? pr.pr_id);
    }
    if (seen.size > 0) {
      map.set(
        detail.id,
        [...seen].map(([id, no]) => ({ id, no })),
      );
    }
  }
  return map;
}

/**
 * ป้ายบอกใบขอซื้อต้นทาง กดแล้วเปิดใบนั้นได้เลย
 *
 * แถวเดียวถือได้หลายใบ เพราะรวบหลาย PR เป็น PO ใบเดียวได้
 *
 * **โชว์ปุ่มทุกแถวแม้ยังไม่มีต้นทาง** — ตอนนี้ backend ส่ง `pr_details` มาว่างทุก
 * ฟิลด์แม้กับใบที่ `po_type = purchase_request` จริง ซ่อนปุ่มไว้เลยกลายเป็นแยกไม่ออก
 * ว่า "แถวนี้ไม่มีต้นทาง" หรือ "ฟีเจอร์ยังไม่มา" · กดแล้วบอกตรง ๆ ว่ายังไม่มีข้อมูล
 */
export function PrSourceButton({
  sources,
}: {
  readonly sources?: PrSource[];
}) {
  const t = useTranslations("procurement.purchaseOrder");
  const list = sources ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("fromPrLabel", { count: list.length })}
          className="focus-visible:ring-ring shrink-0 rounded-sm outline-none focus-visible:ring-2"
        >
          <Badge
            variant="secondary"
            size="xs"
            className={cn(
              "hover:bg-accent cursor-pointer gap-1",
              list.length === 0 && "text-muted-foreground",
            )}
          >
            <FileText aria-hidden="true" className="size-3" />
            {/* ใบเดียวโชว์เลขที่ไปเลย ไม่ต้องกดก็รู้ว่ามาจากใบไหน — หลายใบถึงจะ
                นับให้ เพราะเลขที่ทุกใบเรียงกันในป้ายเล็ก ๆ อ่านไม่ออกอยู่ดี */}
            {list.length === 0 && "—"}
            {list.length === 1 && list[0].no}
            {list.length > 1 && t("fromPrCount", { count: list.length })}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <p className="text-muted-foreground text-micro-legal px-2 py-1 font-semibold tracking-wider uppercase">
          {t("fromPr")}
        </p>
        {list.length === 0 && (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">
            {t("noPrSource")}
          </p>
        )}
        <ul>
          {list.map((pr) => (
            <li key={pr.id}>
              <Link
                to={`/procurement/purchase-request/${pr.id}`}
                className="hover:bg-accent focus-visible:bg-accent block truncate rounded-sm px-2 py-1.5 text-xs outline-none"
              >
                {pr.no}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
