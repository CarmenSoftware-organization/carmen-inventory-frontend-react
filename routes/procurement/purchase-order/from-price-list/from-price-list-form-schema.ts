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

/** คลังที่เลือกไว้ในการ์ดหนึ่งใบ — เป็นโครงของ **wizard เท่านั้น** */
export interface FromPriceListItemLocation {
  id: string;
  location_code?: string;
  location_name?: string;
  order_qty: number;
}

/**
 * item ของ wizard = item ของ PO + รายการคลังที่เลือกไว้
 *
 * PO นับ **แถวละคลัง** ตั้งแต่ backend เลิก group location แต่การให้ผู้ใช้เลือก
 * หลายคลังในการ์ดใบเดียวยังสะดวกกว่าให้กดเพิ่มสินค้าซ้ำ ๆ — `locations` จึงอยู่
 * เฉพาะในโลกของ wizard แล้วกางเป็นแถวละคลังตอนสร้าง payload
 * (`expandItemPerLocation`) โครงของ PO ไม่ต้องรู้เรื่องนี้เลย
 */
export type FromPriceListSelectedItem = PoFormValues["items"][number] & {
  locations: FromPriceListItemLocation[];
};

/** Re-export ของ PO_ITEM ให้ wizard ใช้เป็น template เริ่มต้นของ item */
export const WIZARD_ITEM_TEMPLATE: FromPriceListSelectedItem = {
  ...PO_ITEM,
  locations: [],
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
    // items ของ wizard มี `locations` เพิ่มมา — EMPTY_FORM ของ PO เป็น [] อยู่แล้ว
    // แค่ narrow type ให้ตรง
    items: [] as FromPriceListSelectedItem[],
    order_date: new Date().toISOString(),
    buyer_id: profile.userId ?? "",
    buyer_name: profile.fullName ?? "",
    email: profile.email ?? "",
  };
}
