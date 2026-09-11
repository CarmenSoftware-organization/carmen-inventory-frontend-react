import {
  EMPTY_FORM as PO_EMPTY_FORM,
  PO_ITEM,
  type PoFormValues,
} from "../po-form-schema";

/**
 * Shape ของข้อมูลที่ใช้ seed default form values จาก useProfile()
 * เก็บเฉพาะ field ที่ Step 1 ต้องใช้ — กันการ couple กับ shape เต็มของ profile
 *
 * Department ไม่อยู่ใน form (PoFormValues ไม่มี) — แสดงผลใน Step 1 + Summary
 * โดยอ่านจาก `useProfile()` ตรง ๆ
 */
export interface FromPriceListProfileSeed {
  readonly userId?: string;
  readonly fullName?: string | null;
  readonly email?: string;
}

/**
 * Wizard form = PoFormValues 100% — ไม่มี schema แยก
 * เพราะ wizard เพียง "ค่อย ๆ build PoFormValues ข้าม 4 steps"
 * (Step 1 = order details, Step 2 = vendor, Step 3 = items + currency)
 *
 * Validation ใช้ `createPoSchema(tv, tf, true)` จาก `po-form-schema.ts` ตรง ๆ
 */
export type FromPriceListFormValues = Omit<PoFormValues, "items"> & {
  items: FromPriceListSelectedItem[];
};

/**
 * item ของ wizard = item ของ PO + ที่มาของราคา
 *
 * **ตัวตนของแถวใน step 3 คือบรรทัดของ price list ไม่ใช่สินค้า** — สินค้าตัวเดียวกัน
 * อาจอยู่ในหลาย price list คนละราคา ติ๊กแยกกันได้ ถ้าจับคู่ด้วย product_id จะติ๊กได้
 * ใบเดียวและสลับไปมาไม่ได้ · `pricelist_detail_id` คือ id ของบรรทัดนั้น
 *
 * สองฟิลด์นี้อยู่**เฉพาะในโลกของ wizard** ไม่ได้อยู่ในสคีมาของ PO (ต่างจาก PR ที่มี
 * `pricelist_detail_id`/`pricelist_no` ในไอเทมจริง) — `mapItemToPayload` หยิบฟิลด์
 * ทีละตัว ของที่ไม่ได้ประกาศจึงไม่หลุดไปถึง API
 */
export type FromPriceListSelectedItem = PoFormValues["items"][number] & {
  pricelist_detail_id: string;
  pricelist_no: string;
};

/** Re-export ของ PO_ITEM ให้ wizard ใช้เป็น template เริ่มต้นของ item */
export const WIZARD_ITEM_TEMPLATE: FromPriceListSelectedItem = {
  ...PO_ITEM,
  pricelist_detail_id: "",
  pricelist_no: "",
};

/**
 * คืน default values ของ form โดย seed:
 * - order_date = today (ISO)
 * - buyer_id / buyer_name / email = จาก profile
 * - currency_id/code/exchange_rate = "" / 1 (set ใน Step 3 ตอน pick PL)
 * - field อื่น ๆ จาก `EMPTY_FORM` ของ PO
 *
 * @param profile - subset ของผลลัพธ์จาก useProfile() (optional)
 * @returns PoFormValues พร้อมใช้กับ useForm
 */
export function getDefaultValues(
  profile: FromPriceListProfileSeed = {},
): FromPriceListFormValues {
  return {
    ...PO_EMPTY_FORM,
    items: [] as FromPriceListSelectedItem[],
    order_date: new Date().toISOString(),
    buyer_id: profile.userId ?? "",
    buyer_name: profile.fullName ?? "",
    email: profile.email ?? "",
  };
}
