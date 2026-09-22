import { type ReactNode } from "react";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { FileText, PackageCheck } from "lucide-react";
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
  return buildSourceMap(purchaseOrder, (detail) =>
    (detail.pr_details ?? []).map((pr) => [pr.pr_id, pr.pr_no]),
  );
}

/**
 * ใบรับสินค้าที่อ้างแต่ละแถว — ซ้อนอยู่ใน `pr_details[].grn[]` ของ response เดียวกัน
 *
 * **แถว manual / price list จะไม่มีวันมี** เพราะ `grn` แขวนอยู่ใต้ `pr_details`
 * ซึ่งแถวที่ไม่ได้มาจาก PR ส่งมาว่าง — ไม่ใช่ว่ายังไม่ได้รับของ แต่ backend
 * ไม่มีที่ให้มันอยู่ ถ้าต้องโชว์ GRN ของแถว manual ด้วยต้องขอ field ใหม่
 */
export function buildGrnSourceMap(
  purchaseOrder?: PurchaseOrder,
): Map<string, PrSource[]> {
  return buildSourceMap(purchaseOrder, (detail) =>
    (detail.pr_details ?? []).flatMap((pr) =>
      (pr.grn ?? []).map((g) => [g.grn_id, g.grn_no] as const),
    ),
  );
}

function buildSourceMap(
  purchaseOrder: PurchaseOrder | undefined,
  pick: (
    detail: NonNullable<PurchaseOrder["purchase_order_detail"]>[number],
  ) => readonly (readonly [string | null, string | null])[],
): Map<string, PrSource[]> {
  const map = new Map<string, PrSource[]>();
  for (const detail of purchaseOrder?.purchase_order_detail ?? []) {
    const seen = new Map<string, string>();
    for (const [id, no] of pick(detail)) {
      if (!id || seen.has(id)) continue;
      seen.set(id, no ?? id);
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
    <SourceBadge
      list={list}
      icon={<FileText aria-hidden="true" className="size-3" />}
      ariaLabel={t("fromPrLabel", { count: list.length })}
      title={t("fromPr")}
      emptyText={t("noPrSource")}
      countText={t("fromPrCount", { count: list.length })}
      hrefFor={(id) => `/procurement/purchase-request/${id}`}
    />
  );
}

/**
 * ป้ายบอกใบรับสินค้าที่รับของแถวนี้เข้ามา
 *
 * **ซ่อนทั้งป้ายเมื่อยังไม่มีใบ** ต่างจากป้ายใบขอซื้อที่โชว์ค้างไว้ — แถวที่ยัง
 * ไม่ได้รับของคือสถานะปกติของ PO เกือบทุกใบ โชว์ป้ายเปล่าทุกแถวคือ noise
 * และคอลัมน์จำนวนที่รับแล้วบอกเรื่องเดียวกันอยู่แล้ว
 */
export function GrnSourceButton({
  sources,
}: {
  readonly sources?: PrSource[];
}) {
  const t = useTranslations("procurement.purchaseOrder");
  const list = sources ?? [];

  if (list.length === 0) return null;

  return (
    <SourceBadge
      list={list}
      icon={<PackageCheck aria-hidden="true" className="size-3" />}
      ariaLabel={t("grnLabel", { count: list.length })}
      title={t("grnSource")}
      emptyText=""
      countText={t("grnCount", { count: list.length })}
      hrefFor={(id) => `/procurement/goods-receive-note/${id}`}
    />
  );
}

function SourceBadge({
  list,
  icon,
  ariaLabel,
  title,
  emptyText,
  countText,
  hrefFor,
}: {
  readonly list: PrSource[];
  readonly icon: ReactNode;
  readonly ariaLabel: string;
  readonly title: string;
  readonly emptyText: string;
  readonly countText: string;
  readonly hrefFor: (id: string) => string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
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
            {icon}
            {/* ใบเดียวโชว์เลขที่ไปเลย ไม่ต้องกดก็รู้ว่ามาจากใบไหน — หลายใบถึงจะ
                นับให้ เพราะเลขที่ทุกใบเรียงกันในป้ายเล็ก ๆ อ่านไม่ออกอยู่ดี */}
            {list.length === 0 && "—"}
            {list.length === 1 && list[0].no}
            {list.length > 1 && countText}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <p className="text-muted-foreground text-micro-legal px-2 py-1 font-semibold tracking-wider uppercase">
          {title}
        </p>
        {list.length === 0 && (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">
            {emptyText}
          </p>
        )}
        <ul>
          {list.map((doc) => (
            <li key={doc.id}>
              <Link
                to={hrefFor(doc.id)}
                className="hover:bg-accent focus-visible:bg-accent block truncate rounded-sm px-2 py-1.5 text-xs outline-none"
              >
                {doc.no}
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
