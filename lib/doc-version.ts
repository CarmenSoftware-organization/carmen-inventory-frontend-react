/**
 * กติกาเลือก doc_version ที่จะใส่ใน payload (optimistic lock)
 *
 * ทุกเอกสารที่มี workflow (PR · PO · GRN · CN · SR) ใช้กติกาเดียวกัน แต่เดิมต่างคน
 * ต่างเขียน `resolveDocVersion` ของตัวเองไว้ในไฟล์ handler แล้ว **บางโมดูลเรียกใช้
 * เฉพาะตอนยิง workflow action ไม่ได้เรียกตอน /save** ซึ่งเป็นต้นเหตุของ 409 ที่ตาม
 * ยาก: /save bump เวอร์ชันฝั่ง DB แต่ฝั่งฟอร์มยังถือเลขเดิม การบันทึกครั้งถัดไป
 * จึงชนทันที
 *
 * ลำดับความน่าเชื่อถือ ไล่จากสดที่สุดลงไป:
 * 1. `fresh` — GET จาก DB ตรง ๆ ก่อนยิง เป็นความจริง ณ วินาทีนั้น
 * 2. `formValue` — ค่าที่ sync กลับเข้าฟอร์มหลัง save รอบก่อน (อาศัย response ที่
 *    backend อาจไม่ส่ง field นี้มาให้ จึงเชื่อได้น้อยกว่าข้อ 1)
 * 3. `recordValue` — ค่าจากตอนโหลดหน้า เก่าที่สุด ใช้เมื่อสองอันบนไม่มีเลย
 * 4. `0` — ใบที่ backend ยังไม่เคยให้เวอร์ชัน
 *
 * ใช้ `??` ไม่ใช่ `||` โดยตั้งใจ — `doc_version: 0` เป็นค่าที่ถูกต้อง ไม่ใช่ "ไม่มีค่า"
 *
 * @example
 * const fresh = await fetchFreshPr(id);
 * pickDocVersion(fresh?.doc_version, form.getValues("doc_version"), pr?.doc_version)
 */
export function pickDocVersion(
  fresh: number | null | undefined,
  formValue?: number | null,
  recordValue?: number | null,
): number {
  return fresh ?? formValue ?? recordValue ?? 0;
}
