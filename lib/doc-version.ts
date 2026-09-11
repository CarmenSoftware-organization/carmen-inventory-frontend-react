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

/**
 * ทับ `doc_version` ของแถวที่กำลังจะ update ด้วยเลขสดจาก DB
 *
 * optimistic lock ของ backend เช็ค**ราย detail** ด้วย ไม่ใช่แค่หัวเอกสาร —
 * `409 (model=tb_<doc>_detail, expected doc_version=N)` คือเคสนี้ตรง ๆ
 * ทุกโมดูลส่ง `doc_version` ราย item ใน payload อยู่แล้ว แต่เลขนั้นสดได้ทางเดียว
 * คือ sync กลับจาก response ของ /save ซึ่ง backend อาจไม่ส่ง detail กลับมา
 *
 * **ทับที่ผลลัพธ์ ไม่ใช่ที่ input ของ `buildItemChanges`** — ตัวนั้นตัดสินว่าแถวไหน
 * "เปลี่ยน" ด้วยการ JSON.stringify payload เทียบกับ baseline ถ้าไปดัน doc_version
 * เข้า input ทุกแถวจะกลายเป็น update หมดทั้งที่ผู้ใช้ไม่ได้แตะ
 *
 * @param update - `changes.update` ที่ `buildItemChanges` คืนมา
 * @param fresh - `purchase_request_detail` จาก GET ล่าสุด
 */
export function withFreshDetailVersions<T extends { id: string }>(
  update: T[] | undefined,
  fresh: readonly { id: string; doc_version?: number }[] | undefined,
): T[] | undefined {
  if (!update?.length || !fresh?.length) return update;
  const byId = new Map(fresh.map((d) => [d.id, d.doc_version]));
  return update.map((row) => {
    const version = byId.get(row.id);
    return version == null ? row : { ...row, doc_version: version };
  });
}
