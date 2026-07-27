/**
 * คอลัมน์ของตาราง PR v2 — ชุดเดียวตายตัว หัวตารางแถวเดียว
 *
 * เคยมีหัวตารางสองชั้น (ชื่อกลุ่มแบบ merge cell คร่อม "จำนวน / ราคา / ส่งของ") แล้ว
 * ถอดออก: พอตรึงคอลัมน์ระบุตัวตนไว้ซ้าย หัวที่ merge ข้ามคอลัมน์เลื่อนตามไม่ได้ —
 * เลื่อนขวาแล้วป้าย "ราคา/ผู้ขาย" ไปลอยอยู่เหนือช่องที่ตรึงไว้ ซึ่งบอกข้อมูลผิด
 *
 * เคยลองทำปุ่ม "ดู: จำนวน / ราคา / ส่งของ / ทั้งหมด" ให้กดสลับชุดคอลัมน์ แล้วถอดออก:
 * หน้าเดิมมีชุดคอลัมน์เดียว การเพิ่มปุ่มสลับทำให้คนใช้ต้องจำว่าของที่หาอยู่ไปอยู่ชุดไหน
 *
 * สิ่งที่ทำให้ตารางกว้างๆ ใช้ได้จริงคือ **ตรึงคอลัมน์ระบุตัวตน** ไม่ใช่ซ่อนคอลัมน์
 * ที่เหลือ — เลื่อนไปดูภาษีก็ยังเห็นว่าเป็นภาษีของสินค้าตัวไหน
 */
export interface Pr2Column {
  readonly key: string;
  /** key ของ i18n namespace "field" — undefined = คอลัมน์ไม่มีหัว (เช่น checkbox) */
  readonly labelKey?: string;
  /** ความกว้างคงที่ (rem) — ตายตัวทุกคอลัมน์เพราะ offset ของ sticky ต้องคำนวณล่วงหน้า */
  readonly rem: number;
  readonly align?: "right" | "center";
  /** กดหัวคอลัมน์เพื่อเรียงได้ไหม (default: ได้) */
  readonly sortable?: boolean;
}

const COL = {
  select: { key: "select", rem: 2.25, align: "center" },
  seq: { key: "seq", rem: 2.5, align: "right" },
  status: { key: "status", labelKey: "status", rem: 6.5 },
  product: { key: "product", labelKey: "product", rem: 12 },
  location: { key: "location", labelKey: "location", rem: 8 },
  requested: { key: "requested", labelKey: "requestedQty", rem: 8, align: "right" },
  approved: { key: "approved", labelKey: "approvedQty", rem: 8, align: "right" },
  foc: { key: "foc", labelKey: "foc", rem: 8, align: "right" },
  vendor: { key: "vendor", labelKey: "vendor", rem: 10 },
  unitPrice: { key: "unitPrice", labelKey: "unitPrice", rem: 8, align: "right" },
  /**
   * อัตราแลกเปลี่ยน — หน้าเดิมมีช่องนี้ใน expand row (`pr-item-expand.tsx:310`)
   * ขาดไปแล้วยอดสกุลหลัก (base_*) ที่ส่งขึ้น backend ผิดทั้งใบเมื่อซื้อสกุลอื่น
   */
  exchangeRate: {
    key: "exchangeRate",
    labelKey: "exchangeRate",
    rem: 7,
    align: "right",
  },
  discount: { key: "discount", labelKey: "discount", rem: 7.5, align: "right" },
  tax: { key: "tax", labelKey: "tax", rem: 9, align: "right" },
  /** ยอด + สกุลเงิน — คอลัมน์ `amount` ของหน้าเดิม (`pr-item-table.tsx:291`) */
  amount: { key: "total", labelKey: "amountCurShort", rem: 11, align: "right" },
  deliveryPoint: { key: "deliveryPoint", labelKey: "deliveryPoint", rem: 9 },
  deliveryDate: { key: "deliveryDate", labelKey: "deliveryDate", rem: 9 },
  // หมายเหตุเป็น free text — เรียงแล้วไม่ได้ความหมายอะไร ปิดไป
  comment: { key: "comment", labelKey: "comment", rem: 10, sortable: false },
  /** ท้ายแถว — ประวัติรายการ + ปุ่มลบ (คอลัมน์ `action` ของหน้าเดิม) */
  action: { key: "action", rem: 4.5, align: "center" },
} satisfies Record<string, Pr2Column>;

/**
 * คอลัมน์ที่ตรึงซ้าย
 *
 * - checkbox โผล่เฉพาะตอนแก้ไขได้และ role เลือกแถวได้ — โหมดอ่านไม่มีอะไรให้ทำ
 *   กับที่เลือก หน้าเดิมก็ซ่อน (header คืน null เมื่อ isDisabled) จึงไม่ต้องกินที่
 * - สถานะไม่มีในมุมมองผู้สร้าง (ใบร่างยังไม่เข้า workflow ทุกแถวเป็น "รอ" หมด)
 * - คลังมาก่อนสินค้า ตามลำดับหน้าเดิม (`location_id` → `product_id`) และมีเหตุผล:
 *   ตัวเลือกสินค้าขึ้นกับคลังที่เลือก (LookupProductInLocation)
 */
function frozenColumns(
  isCreatorView: boolean,
  showSelect: boolean,
): readonly Pr2Column[] {
  return [
    ...(showSelect ? [COL.select] : []),
    COL.seq,
    ...(isCreatorView ? [] : [COL.status]),
    COL.location,
    COL.product,
  ];
}

/**
 * คอลัมน์ทั้งหมดของตาราง
 *
 * @param isCreatorView - ใบยังเป็นร่าง หรือคนดูคือผู้สร้าง (`isDraft || role === CREATE`)
 *
 * หน้าเดิมตัดคอลัมน์ชุดนี้ทิ้งในเงื่อนไขเดียวกัน (`pr-item-table.tsx:377-393`):
 * - `approved` / `foc` — ยังไม่ถึงขั้นอนุมัติ ไม่ต้องมีช่องให้กรอก
 * - checkbox เลือกแถว — ยังไม่มี bulk action ให้ทำ (ตัดคอลัมน์ทิ้ง ไม่ใช่ปล่อยว่าง)
 * - สถานะรายรายการ — ใบร่างยังไม่เข้า workflow ทุกแถวเป็น "รอ" เหมือนกันหมด
 * - **ผู้ขาย / ราคาต่อหน่วย / ส่วนลด / ภาษี ไม่เคยเป็นคอลัมน์ในหน้าเดิมเลย**
 *   มันอยู่ใน expand row ที่ผู้สร้างเปิดดูได้แต่แก้ไม่ได้ · v2 ไม่มี expand จึงเอา
 *   ขึ้นมาเป็นคอลัมน์ แต่กับผู้สร้างต้องซ่อนเหมือนเดิม
 *
 * @param showAction - หน้าเดิมตัดคอลัมน์ action ทิ้งเมื่ออยู่โหมดอ่านและไม่มีรายการ
 *   ไหนมีประวัติเลย (`pr-item-table.tsx:397`) — ไม่มีอะไรให้กดก็ไม่ต้องมีคอลัมน์
 */
export function pr2Columns(
  isCreatorView = false,
  showAction = true,
  showSelect = false,
): readonly Pr2Column[] {
  const frozen = frozenColumns(isCreatorView, showSelect);
  const body = isCreatorView
    ? [
        ...frozen,
        COL.requested,
        COL.amount,
        COL.deliveryPoint,
        COL.deliveryDate,
        COL.comment,
      ]
    : [
        ...frozen,
        COL.requested,
        COL.approved,
        COL.foc,
        COL.vendor,
        COL.unitPrice,
        COL.exchangeRate,
        COL.discount,
        COL.tax,
        COL.amount,
        COL.deliveryPoint,
        COL.deliveryDate,
        COL.comment,
      ];
  return showAction ? [...body, COL.action] : body;
}

/** จำนวนคอลัมน์ที่ตรึงซ้าย */
export function pr2FrozenCount(isCreatorView = false, showSelect = false): number {
  return frozenColumns(isCreatorView, showSelect).length;
}

/** ตำแหน่ง left สะสมของคอลัมน์ตรึง — คิดจากชุดที่แสดงจริง ไม่ใช่ชุดคงที่ */
export function pr2FrozenOffsets(
  isCreatorView = false,
  showSelect = false,
): readonly string[] {
  let acc = 0;
  return frozenColumns(isCreatorView, showSelect).map((c) => {
    const at = acc;
    acc += c.rem;
    return `${at}rem`;
  });
}

/** ความกว้างรวมของตาราง — แคบกว่านี้เลื่อนแนวนอน (คอลัมน์ตรึงคุมบริบทให้) */
export function pr2MinWidth(
  isCreatorView = false,
  showAction = true,
  showSelect = false,
): string {
  return `${pr2Columns(isCreatorView, showAction, showSelect).reduce((n, c) => n + c.rem, 0)}rem`;
}
