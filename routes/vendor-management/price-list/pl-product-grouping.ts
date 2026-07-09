import type { PriceList } from "@/types/price-list";

export type DetailRef = PriceList["pricelist_detail"][number];

export interface ProductGroup {
  readonly productId: string;
  readonly groupNumber: number;
  /** tiers ของ product นี้ เรียงตาม MOQ น้อย→มาก */
  readonly tiers: readonly DetailRef[];
}

/**
 * group `detailRefs` ตาม `product_id` (เรียง group ตามลำดับที่เจอครั้งแรก) แล้ว
 * sort tier ในกลุ่มตาม MOQ น้อย→มาก — ใช้ render แบบ rowspan (product โชว์ครั้ง
 * เดียวต่อกลุ่ม) ใน view mode ของ price-list เท่านั้น
 */
export function buildProductGroups(
  detailRefs: PriceList["pricelist_detail"] | undefined,
): ProductGroup[] {
  const order: string[] = [];
  const byProduct = new Map<string, DetailRef[]>();
  for (const ref of detailRefs ?? []) {
    let bucket = byProduct.get(ref.product_id);
    if (!bucket) {
      bucket = [];
      byProduct.set(ref.product_id, bucket);
      order.push(ref.product_id);
    }
    bucket.push(ref);
  }

  return order.map((productId, i) => ({
    productId,
    groupNumber: i + 1,
    tiers: [...byProduct.get(productId)!].sort(
      (a, b) => (Number(a.moq_qty) || 0) - (Number(b.moq_qty) || 0),
    ),
  }));
}
