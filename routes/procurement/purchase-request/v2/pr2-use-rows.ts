import { useMemo } from "react";
import { useWatch, type Control } from "react-hook-form";
import type { PrFormValues } from "../pr-form-schema";
import { STATUS_NORMALIZE } from "../pr-item-cells/helpers";

/** normalize ค่าที่ backend ส่งมา (approve/submit/reject) ให้เป็นรูปเดียวกับที่ UI ใช้ */
export function normalizeItemStatus(raw: string): string {
  return STATUS_NORMALIZE[raw] ?? raw;
}

export type Pr2SortDir = "asc" | "desc";

export interface Pr2Sort {
  readonly key: string;
  readonly dir: Pr2SortDir;
}

export interface Pr2RowsResult {
  /** ลำดับ index ของ items ที่จะแสดง (กรอง + เรียงแล้ว) */
  readonly rows: readonly number[];
  readonly counts: Record<string, number>;
  readonly totalCount: number;
}

type Item = PrFormValues["items"][number];

/** ค่าที่ใช้เปรียบเทียบของแต่ละคอลัมน์ — คืนเลขหรือข้อความตามชนิดของข้อมูลจริง */
function sortValue(item: Item, key: string): string | number {
  switch (key) {
    case "status":
      return normalizeItemStatus(item.current_stage_status || "pending");
    case "product":
      return item.product_name ?? "";
    case "location":
      return item.location_name ?? "";
    case "requested":
      return Number(item.requested_qty ?? 0);
    case "approved":
      return Number(item.approved_qty ?? 0);
    case "foc":
      return Number(item.foc_qty ?? 0);
    case "vendor":
      return item.vendor_name ?? "";
    case "unitPrice":
      return Number(item.pricelist_price ?? 0);
    case "exchangeRate":
      return Number(item.exchange_rate ?? 1);
    case "subtotal":
      return (
        Number(item.pricelist_price ?? 0) *
        (Number(item.approved_qty) || Number(item.requested_qty) || 0)
      );
    case "net":
      return Number(item.net_amount ?? 0);
    case "discount":
      return Number(item.discount_amount ?? 0);
    case "tax":
      return Number(item.tax_amount ?? 0);
    case "currency":
      return item.currency_code ?? "";
    case "total":
      return Number(item.total_price ?? 0);
    case "deliveryPoint":
      return item.delivery_point_name ?? "";
    case "deliveryDate":
      return item.delivery_date ?? "";
    case "comment":
      return item.comment ?? "";
    default:
      return "";
  }
}

/**
 * กรอง + เรียงรายการ แล้วนับสถานะไปด้วยในรอบเดียว
 *
 * ไม่จัดกลุ่มตามคลังแล้ว — การจัดกลุ่มทำให้ลำดับที่เห็นไม่ตรงกับลำดับจริงในใบ
 * (ใบที่คลังสลับกันไปมาจะเห็นเลขวิ่ง 1, 6, 11, 16…) ซึ่งอ่านแล้วสับสนกว่าที่ได้
 * ประโยชน์จากยอดย่อยต่อคลัง · อยากดูเป็นกลุ่มก็กดเรียงตามคอลัมน์คลังเอา
 *
 * นับสถานะจาก items ทั้งหมดเสมอ ไม่ใช่จากผลกรอง ไม่งั้นกด "รอ 8" แล้วตัวเลขอื่นหาย
 */
export function usePr2Rows(
  control: Control<PrFormValues>,
  search: string,
  statusFilter: string | null,
  sort: Pr2Sort | null,
): Pr2RowsResult {
  "use no memo";
  const watched = useWatch({ control, name: "items" });

  return useMemo(() => {
    const items = watched ?? [];
    const keyword = search.trim().toLowerCase();

    const counts: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      review: 0,
    };
    for (const item of items) {
      const s = normalizeItemStatus(item?.current_stage_status || "pending");
      if (s in counts) counts[s] += 1;
    }

    const rows: number[] = [];
    items.forEach((item, index) => {
      if (!item) return;
      const status = normalizeItemStatus(item.current_stage_status || "pending");
      if (statusFilter && status !== statusFilter) return;
      if (keyword) {
        const haystack = [
          item.product_name,
          item.product_code,
          item.product_local_name,
          item.vendor_name,
          item.location_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return;
      }
      rows.push(index);
    });

    // ไม่ได้สั่งเรียง = ลำดับตามที่อยู่ในใบจริง (เลขแถวจึงเรียง 1,2,3 ตามธรรมชาติ)
    if (sort) {
      const dir = sort.dir === "asc" ? 1 : -1;
      rows.sort((a, b) => {
        const va = sortValue(items[a], sort.key);
        const vb = sortValue(items[b], sort.key);
        if (typeof va === "number" && typeof vb === "number") {
          return (va - vb) * dir;
        }
        return String(va).localeCompare(String(vb), undefined, {
          numeric: true,
        }) * dir;
      });
    }

    return { rows, counts, totalCount: items.length };
  }, [watched, search, statusFilter, sort]);
}
