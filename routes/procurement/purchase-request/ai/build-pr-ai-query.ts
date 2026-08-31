/**
 * ข้อมูล item ที่ส่งให้ AI
 *
 * ส่ง **จำนวน หน่วย และราคาที่จะจ่าย** ไปด้วยเสมอ ไม่ใช่แค่ชื่อสินค้า — คำถามคือ
 * "ราคานี้สมเหตุสมผลไหม" ซึ่งตอบไม่ได้เลยถ้าไม่รู้ว่าซื้อกี่หน่วยและจ่ายเท่าไหร่
 * (ราคาตลาดของ 1 ขวดกับ 100 ลังคนละเรื่อง)
 *
 * **ไม่ส่งชื่อคลัง** — ไม่ช่วยให้คำตอบดีขึ้นเลย แต่บอกโครงสร้างภายในโรงแรมออกไป
 * ให้บริการภายนอกฟรี ๆ
 */
export interface PrAiQueryItem {
  readonly productName: string;
  readonly productLocalName?: string;
  readonly qty?: number;
  readonly unitName?: string;
  readonly price?: number;
  readonly currencyCode?: string;
}

/**
 * บริบทที่ AI ต้องรู้ก่อนตอบ
 *
 * ไม่มีบรรทัดพวกนี้ AI จะตอบเป็นราคาปลีกสกุลดอลลาร์จากเว็บอเมริกา เพราะไม่มีอะไร
 * บอกว่าคนถามเป็นฝ่ายจัดซื้อโรงแรมในไทยที่ซื้อขายส่งเข้าครัว
 *
 * บรรทัด "อย่าเดา" สำคัญที่สุด — คำตอบนี้ไปอยู่ในมือคนที่กำลังจะเซ็นอนุมัติ AI
 * สาธารณะไม่รู้จักซัพพลายเออร์ในไทยจริง ถ้าไม่ห้ามไว้มันจะแต่งชื่อบริษัทออกมา
 * ซึ่งอันตรายกว่าไม่ตอบ
 */
const CONTEXT = [
  "You are helping a hotel purchasing officer in Thailand review a purchase request.",
  "Prices are for wholesale / foodservice supply, not retail.",
  "",
  "For each item below, give a typical wholesale price range for that pack size and",
  "say whether the quoted price looks reasonable. Answer as a short table.",
  "If you are not confident about Thai market prices, say so instead of guessing.",
  "Do not invent supplier names.",
  "",
];

/** ตัวเลขในตาราง — ไม่ใส่ตัวคั่นหลักพันเพราะทำให้ AI อ่านผิดเป็นทศนิยม */
function money(value: number | undefined, currency: string | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  return `${value.toFixed(2)}${currency ? ` ${currency}` : ""}`;
}

/**
 * สร้าง prompt สำหรับส่งให้ AI provider จากรายการ item ที่เลือก
 *
 * @param items - รายการ item ที่ติ๊กเลือกไว้
 * @returns ข้อความ prompt พร้อมส่ง
 */
export function buildPrAiQuery(items: readonly PrAiQueryItem[]): string {
  const rows = items
    .filter((it) => it.productName)
    .map((it, i) => {
      const name = it.productLocalName
        ? `${it.productName} (${it.productLocalName})`
        : it.productName;
      const qty =
        typeof it.qty === "number" && it.qty > 0
          ? `${it.qty}${it.unitName ? ` ${it.unitName}` : ""}`
          : "—";
      return `| ${i + 1} | ${name} | ${qty} | ${money(it.price, it.currencyCode)} |`;
    });

  return [
    ...CONTEXT,
    "| # | Item | Qty | Quoted price |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}
