/**
 * รูปแบบ detail ขั้นต่ำที่ grouped view / grouping ต้องใช้ — ทั้ง price-list ภายใน
 * และ portal ภายนอก (RFQ) ต่างมี field พวกนี้ครบ (superset assignable) จึง reuse
 * component/logic เดียวกันได้ · subtext ใต้ชื่อ product ใช้ product_local_name ก่อน
 * ถ้าไม่มี fallback product_code (portal ไม่มี local name แต่มี code)
 */
export interface GroupableDetail {
  readonly id?: string | null;
  readonly product_id: string;
  readonly product_name?: string | null;
  readonly product_local_name?: string | null;
  readonly product_code?: string | null;
  readonly unit_name?: string | null;
  readonly moq_qty: number | string;
  /** ราคารวมภาษี (gross) — authoritative amount */
  readonly price?: number | string;
  readonly price_without_tax: number | string;
  readonly tax_rate: number | string;
  readonly lead_time_days?: number | string | null;
  readonly is_preferred?: boolean;
}

export type DetailRef = GroupableDetail;

export interface ProductGroup {
  readonly productId: string;
  readonly groupNumber: number;
  /** tiers ของ product นี้ เรียงตาม MOQ น้อย→มาก */
  readonly tiers: readonly GroupableDetail[];
}

/**
 * group `detailRefs` ตาม `product_id` (เรียง group ตามลำดับที่เจอครั้งแรก) แล้ว
 * sort tier ในกลุ่มตาม MOQ น้อย→มาก — ใช้ render แบบ rowspan (product โชว์ครั้ง
 * เดียวต่อกลุ่ม) ใน view mode ของ price-list เท่านั้น
 */
export function buildProductGroups(
  detailRefs: readonly GroupableDetail[] | undefined,
): ProductGroup[] {
  const order: string[] = [];
  const byProduct = new Map<string, GroupableDetail[]>();
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
