/**
 * ข้อมูล item ขั้นต่ำที่ส่งให้ AI — เริ่มจาก location + product ก่อน
 * (เพิ่ม field อื่น เช่น qty/unit/currency ภายหลังได้)
 */
export interface PrAiQueryItem {
  readonly productName: string;
  readonly productLocalName?: string;
  readonly locationName?: string;
}

/**
 * สร้าง prompt/query สำหรับส่งให้ AI provider จากรายการ item ที่เลือก
 *
 * รูปแบบ: header + รายการสินค้าทีละบรรทัด (ชื่อสินค้า + ชื่อท้องถิ่น + location)
 * ใช้ร่วมกับ `ai-providers.ts` (`buildUrl(query)`) เพื่อเปิดหน้า provider
 *
 * @param items - รายการ item ที่เลือก (จาก row ที่ check)
 * @returns ข้อความ prompt พร้อมส่ง
 */
export function buildPrAiQuery(items: readonly PrAiQueryItem[]): string {
  const lines = items
    .filter((it) => it.productName)
    .map((it, i) => {
      const parts = [it.productName];
      if (it.productLocalName) parts.push(`(${it.productLocalName})`);
      if (it.locationName) parts.push(`@ ${it.locationName}`);
      return `${i + 1}. ${parts.join(" ")}`;
    });

  const header =
    "Help me research these purchase request items (market price, alternative products, and vendor suggestions):";

  return [header, ...lines].join("\n");
}
