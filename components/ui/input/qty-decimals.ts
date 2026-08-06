/**
 * กติกาทศนิยมของช่อง "จำนวน" ที่ทุกช่อง qty ในแอปใช้ร่วมกัน
 *
 * ของชั่ง/ตวงรับเป็นเศษได้จริง (หมูเนื้อแดง 2.5 kg) จึงห้ามล็อกเป็นจำนวนเต็ม
 * เพดานอยู่ที่ 5 ตำแหน่งตามคอลัมน์จริงในฐานข้อมูล — ทุก qty เป็น Decimal(20,5)
 *
 * ไม่ผูกกับ `quantity_format.minimumIntegerDigits` ของ BU เหมือนโค้ดเดิม เพราะนั่น
 * คือ "จำนวนหลักหน้าจุด" ของ Intl ไม่ใช่จำนวนทศนิยม — เอามาใช้เป็นเพดานทศนิยม
 * ทำให้ BU ที่ตั้งค่าไว้ 1 พิมพ์ 2.55 ไม่ได้ ทั้งที่ฐานข้อมูลเก็บได้
 */
export const QTY_MAX_DECIMALS = 5;

/**
 * ใช้เมื่อยังไม่รู้ `decimal_place` ของหน่วยนั้น (กำลังโหลด / ไม่มีหน่วยให้ดู)
 *
 * ค่าจริงต่อหน่วยมาจาก master data — `/api/{bu}/units/order/product/{id}` ส่ง
 * `decimal_place` มาให้ทุกหน่วยอยู่แล้ว (kg ให้เศษ, EA เป็น 0) อ่านผ่าน
 * `useUnitDecimals` · เลข 2 ตรงกับ `DEFAULT_DECIMAL_PLACE` ฝั่งหลังบ้าน
 */
export const DEFAULT_QTY_DECIMALS = 2;

/**
 * `step` ของ input[type=number] สำหรับช่องจำนวน
 *
 * ต้องเป็น "any" ไม่ใช่ค่าคงที่ — ไม่ใส่ step เบราว์เซอร์ถือว่า step = 1 แล้วตี
 * 2.5 เป็นค่าไม่ถูกต้อง (stepMismatch) ส่วน step ตายตัวอย่าง "0.01" ก็ปัดตกค่า
 * ที่ละเอียดกว่านั้นทิ้งเหมือนกัน — เพดานจริงคุมที่ `capQtyDecimals` แทน
 */
export const QTY_STEP = "any";

/**
 * ตัดทศนิยมส่วนที่เกินเพดานออกจากค่าที่กำลังพิมพ์ (แก้ที่ DOM ก่อนส่งต่อ onChange)
 *
 * @param el - input element ที่กำลังพิมพ์
 * @param decimals - จำนวนทศนิยมสูงสุด (default `DEFAULT_QTY_DECIMALS`)
 * @example
 * ```ts
 * onChange={(e) => { capQtyDecimals(e.currentTarget); onChange?.(e); }}
 * ```
 */
export function capQtyDecimals(
  el: HTMLInputElement,
  decimals: number = DEFAULT_QTY_DECIMALS,
): void {
  const val = el.value;
  const dot = val.indexOf(".");
  if (dot === -1) return;
  if (val.length - dot - 1 <= decimals) return;
  el.value =
    decimals > 0 ? val.slice(0, dot + decimals + 1) : val.slice(0, dot);
}
