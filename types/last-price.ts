/**
 * ต้นทุนต่อหน่วยครั้งล่าสุดของสินค้า — มาพร้อม response ของทั้งหน้าเทียบราคา
 * (PR), on hand และ on order
 *
 * **เป็นสกุลเงินตั้งต้นของ BU เสมอ ไม่ใช่สกุลของใบ** backend คิดต้นทุนมาเป็น
 * สกุลตั้งต้นอยู่แล้ว เอาสกุลของใบมาแปะจะอ่านผิดทันทีเวลาใบเป็น USD
 */
export interface LastPrice {
  cost_per_unit: number;
  doc_type: string;
  doc_id: string;
  at: string;
}
