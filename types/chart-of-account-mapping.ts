export type CodeName = { code: string; name: string };

/**
 * หนึ่งแถวของผังการผูกบัญชี — บอกว่า "ของกลุ่มนี้ ที่คลังนี้ ของแผนกนี้"
 * ผูกกับรหัสบัญชีไหน และผูกครบหรือยัง
 *
 * ยังไม่มี endpoint จริง — หน้า list ตอนนี้อ่านจาก `coam-mock.ts` เพื่อให้เห็นรูปหน้า
 * ก่อน พอ backend พร้อมค่อยสลับ `useAccountMapping` ไปยิง API แล้วลบ mock ทิ้ง
 */
export interface AccountMappingRow {
  id: string;
  business_unit: string;
  store_location: CodeName;
  category: CodeName;
  sub_category: CodeName;
  item_group: CodeName;
  department: CodeName;
  account_code: CodeName;
  is_mapped: boolean;
  mapping_type: "AP" | "GL";
  last_scanned_at: string | null;
}
