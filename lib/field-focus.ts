/**
 * ref ที่ชี้ไปยังช่องกรอกของฟิลด์ตามชื่อที่ react-hook-form register ไว้
 *
 * ใช้กับ `nextFocusRef` ของ lookup — พอเลือกค่าเสร็จให้เด้งโฟกัสไปช่องถัดไปของ
 * แถวเดียวกันต่อเลย (สถานที่ → จำนวน) คนกรอกจะได้ไม่ต้องละมือไปคลิกเอง
 *
 * ทำไมไม่ส่ง ref จริง: ในตาราง แต่ละช่องเป็น cell component คนละตัว การจะส่ง ref
 * ข้ามเซลล์ต้องยกที่เก็บ ref ขึ้นไปไว้ระดับตารางแล้วเดินสายลงมาทุกคอลัมน์ —
 * เยอะเกินกว่าเหตุ ในเมื่อ RHF ตั้ง `name` ให้ทุกช่องอยู่แล้วและชื่อนั้นไม่ซ้ำกัน
 *
 * อ่านค่า ณ ตอนที่ถูกใช้ (getter) ไม่ใช่ตอนสร้าง — ช่องปลายทางอาจยัง disabled
 * หรือยังไม่ mount ตอนที่ผูก ref
 */
export function fieldFocusRef<T extends HTMLElement = HTMLInputElement>(
  name: string,
): React.RefObject<T | null> {
  return {
    get current() {
      return document.querySelector<T>(
        `[name="${CSS.escape(name)}"]:not([disabled])`,
      );
    },
    // lookup อ่านอย่างเดียว — เขียนกลับมาไม่มีความหมาย แต่ต้องมีให้ครบ type
    set current(_el: T | null) {},
  };
}
