interface NameWithSubtextProps {
  primary: string;
  secondary?: string;
}

/**
 * ชื่อ + บรรทัดรอง
 *
 * **`leading-[normal]` ทั้งสองบรรทัดมีไว้เพื่อภาษาไทยโดยเฉพาะ อย่าถอดออก** —
 * `truncate` มี `overflow: hidden` ติดมาด้วย กล่องบรรทัดจึงเฉือนทุกอย่างที่ล้น
 * ออกไปข้างบน ภาษาไทยซ้อนได้ถึงสามชั้น (พยัญชนะ + สระบน + วรรณยุกต์ เช่น "ชิ้")
 * วรรณยุกต์ชั้นบนสุดจึงโดนตัดหัว — อังกฤษไม่เจอเพราะสูงชั้นเดียว ทดสอบด้วย
 * ข้อความอังกฤษล้วนจึงมองไม่เห็น
 *
 * ใช้ค่า `normal` ไม่ใช่ตัวเลข (1.35 ของ token / 1.5 ของ leading-normal) เพราะ
 * ตัวเลขคือการเดาว่าฟอนต์สูงเท่าไร · `normal` ให้เบราว์เซอร์คิดจาก metric ของฟอนต์
 * ที่เรนเดอร์จริง เปลี่ยนฟอนต์ไทยเมื่อไรก็ยังพอดีเอง
 *
 * **`py-0.5` ก็ห้ามถอด** — ต่อให้กล่องบรรทัดสูงพอ หมึกของฟอนต์ยังล้นออกนอกกล่อง
 * ได้อยู่ดี: metric ที่ฟอนต์ประกาศไว้เป็นค่าสำหรับตัวอักษรทั่วไป ไม่ได้เผื่อวรรณยุกต์
 * ที่ซ้อนสูงสุดหรือสระล่างที่ห้อยลึกสุด ("ลูกชิ้นหมู" มีทั้งสองอย่างในคำเดียว —
 * ไม้โทบน "ชิ" ล้นด้านบน สระอูใต้ "ห" ล้นด้านล่าง) แล้ว `overflow: hidden` ของ
 * `truncate` เฉือนตรงขอบกล่องพอดีเป๊ะ · padding อยู่ **ในเขตที่ไม่โดนเฉือน**
 * (overflow ตัดที่ padding box ไม่ใช่ content box) จึงเป็นที่เผื่อหมึกโดยตรง
 * ซึ่งการเพิ่ม line-height แก้ไม่ได้ เพราะ line-height ขยายกล่องรอบ ๆ หมึก
 * ไม่ได้ขยับตำแหน่งหมึกให้เข้ามาข้างใน
 */
export function NameWithSubtext({ primary, secondary }: NameWithSubtextProps) {
  return (
    <div className="group w-full space-y-1 text-left">
      {/* title = ข้อความเต็ม — บรรทัดนี้ truncate ได้ที่ font scale ใหญ่ๆ และไม่มี
          ทางอื่นให้ผู้ใช้อ่านค่าที่ถูกตัดทิ้ง */}
      <p
        className="truncate py-0.5 leading-[normal] font-semibold"
        title={primary}
      >
        {primary}
      </p>
      {secondary && (
        <p
          className="text-muted-foreground text-micro-legal truncate py-0.5 leading-[normal]"
          title={secondary}
        >
          {secondary}
        </p>
      )}
    </div>
  );
}
