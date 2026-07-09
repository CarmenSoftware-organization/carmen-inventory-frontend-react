import type { PriceList } from "@/types/price-list";

export type DetailRef = PriceList["pricelist_detail"][number];

export interface GroupedRow {
  readonly ref: DetailRef;
  readonly groupNumber: number;
  readonly isFirstInGroup: boolean;
  readonly isLastInGroup: boolean;
  readonly key: string;
}

/**
 * group `detailRefs` ตาม `product_id` (เรียง group ตามลำดับที่เจอครั้งแรก) แล้ว
 * sort tier ในกลุ่มตาม MOQ น้อย→มาก คลี่เป็น flat rows พร้อม meta สำหรับ render
 * (product โชว์ครั้งเดียวต่อกลุ่ม) — ใช้ใน view mode ของ price-list เท่านั้น
 */
export function buildGroupedRows(
  detailRefs: PriceList["pricelist_detail"] | undefined,
): GroupedRow[] {
  const groups: DetailRef[][] = [];
  const byProduct = new Map<string, DetailRef[]>();
  for (const ref of detailRefs ?? []) {
    let bucket = byProduct.get(ref.product_id);
    if (!bucket) {
      bucket = [];
      byProduct.set(ref.product_id, bucket);
      groups.push(bucket);
    }
    bucket.push(ref);
  }

  return groups.flatMap((tiers, gi) => {
    const sorted = [...tiers].sort(
      (a, b) => (Number(a.moq_qty) || 0) - (Number(b.moq_qty) || 0),
    );
    return sorted.map((ref, ti) => ({
      ref,
      groupNumber: gi + 1,
      isFirstInGroup: ti === 0,
      isLastInGroup: ti === sorted.length - 1,
      key: ref.id ?? `${ref.product_id}-${ti}`,
    }));
  });
}
