/** คู่รหัส-ชื่อ ที่ backend ส่งมาให้ทุกคอลัมน์อ้างอิงของผังการผูกบัญชี */
export type CodeName = { code: string; name: string };

/**
 * หนึ่งแถวของผังการผูกบัญชี — บอกว่า "ของกลุ่มนี้ ที่คลังนี้ ของแผนกนี้"
 * ผูกกับรหัสบัญชีไหน และผูกครบหรือยัง
 *
 * ยังไม่มี endpoint จริง — หน้า list ตอนนี้อ่านจาก `am-mock.ts` เพื่อให้เห็นรูปหน้า
 * ก่อน พอ backend พร้อมค่อยสลับ `useAccountMapping` ไปยิง API แล้วลบ mock ทิ้ง
 */
export interface AccountMappingRow {
  id: string;
  business_unit: string;
  store_location: CodeName;
  category: CodeName;
  sub_category: CodeName;
  item_group: CodeName;
  /** (A1) แผนกที่รับผิดชอบรายการนี้ */
  department: CodeName;
  /** (A2) รหัสบัญชีปลายทางที่ผูกไว้ */
  account_code: CodeName;
  is_mapped: boolean;
  mapping_type: "AP" | "GL";
  last_scanned_at: string | null;
}
