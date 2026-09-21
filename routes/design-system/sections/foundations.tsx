import { DsSection, DsRow } from "../ds-kit";

const RADIUS = [
  { cls: "rounded-none", px: "0px", note: "ขอบตารางที่ชนกัน, แถบเต็มความกว้าง" },
  { cls: "rounded-sm", px: "6px", note: "ชิปในบรรทัด, ปุ่มในช่องตาราง" },
  { cls: "rounded-md", px: "8px", note: "รัศมีของ control — ปุ่ม, badge, input" },
  { cls: "rounded-lg", px: "10px", note: "การ์ดในลิสต์, พาเนล (ค่า --radius)" },
  { cls: "rounded-xl", px: "12px", note: "primitive Card" },
  { cls: "rounded-full", px: "9999px", note: "จุดสถานะ, avatar, count chip" },
];

const SHADOW = [
  { cls: "shadow-xs", note: "ขอบบางที่สุด — ใช้กับ control ที่ยกนิดเดียว" },
  { cls: "shadow-sm", note: "popover ขนาดเล็ก" },
  { cls: "shadow-md", note: "dropdown, tooltip" },
  { cls: "shadow-lg", note: "dialog" },
  { cls: "shadow-xl", note: "sheet ที่เลื่อนออกมาทับ" },
];

const SPACE = [
  { cls: "p-1", px: "4px" },
  { cls: "p-2", px: "8px" },
  { cls: "p-3", px: "12px" },
  { cls: "p-4", px: "16px" },
  { cls: "p-6", px: "24px" },
  { cls: "p-8", px: "32px" },
];

export function FoundationsSection() {
  return (
    <>
      <DsSection
        id="radius"
        title="Radius"
        description={
          <>
            ฐานคือ <code>--radius: 0.625rem</code> ที่ globals.css ขั้นที่เหลือ
            คำนวณจากค่านี้ — ปุ่มทรงแคปซูลเคยลองแล้วและ{" "}
            <b>ถอดออกโดยตั้งใจ</b> เพราะไม่เข้ากับ chrome ที่หนาแน่น
            ทรงแคปซูลสงวนไว้ให้ตัวบ่งชี้ ไม่ใช่ปุ่มกด
          </>
        }
      >
        <div className="flex flex-wrap gap-4">
          {RADIUS.map((r) => (
            <div key={r.cls} className="w-32">
              <div
                className={`${r.cls} flex h-14 items-center justify-center border-2 border-primary/40 bg-primary/10`}
              />
              <div className="mt-1 font-mono text-micro-legal">{r.cls}</div>
              <div className="text-micro-legal text-muted-foreground">
                {r.px} · {r.note}
              </div>
            </div>
          ))}
        </div>
      </DsSection>

      <DsSection
        id="elevation"
        title="Elevation"
        description="chrome เป็นแบบแบน — การ์ดใช้เส้นขอบเส้นเดียวกับพื้นผิวที่ต่างไปหนึ่งขั้น ไม่มีเงา เงาสงวนไว้ให้ของที่ลอยจริง ๆ เท่านั้น"
        usage={
          <>
            ถ้ากำลังจะใส่เงาให้การ์ดในลิสต์ — <b>อย่า</b> ใช้ <code>bg-card</code>{" "}
            + <code>border</code> แทน เงาบนพื้นผิวที่ไม่ได้ลอยทำให้ตารางอ่านยากขึ้น
            โดยไม่ได้บอกอะไรเพิ่ม
          </>
        }
      >
        <div className="flex flex-wrap gap-4">
          {SHADOW.map((s) => (
            <div key={s.cls} className="w-40">
              <div
                className={`${s.cls} flex h-16 items-center justify-center rounded-lg border bg-card text-micro`}
              >
                {s.cls}
              </div>
              <div className="mt-1.5 text-micro-legal text-muted-foreground">
                {s.note}
              </div>
            </div>
          ))}
        </div>
      </DsSection>

      <DsSection
        id="spacing"
        title="Spacing"
        description="สเกล 4px ของ Tailwind ตรง ๆ ไม่มีสเกลของตัวเอง"
        usage={
          <>
            <b>ห้ามประกาศ token ชื่อ <code>--spacing-md</code></b> (รวมถึง sm /
            lg / xl / 2xl) — ใน Tailwind v4 คีย์พวกนี้ใช้ร่วมกับสเกล container
            การประกาศจะไปทับ <code>max-w-md</code> ทั้งแอป (28rem → ค่าที่ตั้ง)
            แล้วการ์ด login กับพาเนลจะยุบจนข้อความตัดบรรทัดละคำ ถ้าต้องการค่านอก
            สเกลให้ใช้ <code>p-[1.0625rem]</code> หรือชื่อที่ไม่ชน เช่น{" "}
            <code>--spacing-17</code>
          </>
        }
      >
        <div className="flex flex-wrap items-end gap-4">
          {SPACE.map((s) => (
            <div key={s.cls} className="text-center">
              <div className={`${s.cls} inline-block rounded bg-primary/15`}>
                <div className="size-6 rounded-sm bg-primary/70" />
              </div>
              <div className="mt-1 font-mono text-micro-legal">{s.cls}</div>
              <div className="text-micro-legal text-muted-foreground">
                {s.px}
              </div>
            </div>
          ))}
        </div>
      </DsSection>

      <DsSection
        id="motion"
        title="Motion"
        description="transition ถูกตั้งไว้ที่ระดับ base สำหรับปุ่ม ลิงก์ แถวตาราง และช่องกรอก — ไม่ต้องใส่ซ้ำที่ call site"
        usage={
          <>
            <code>prefers-reduced-motion</code> ถูกเคารพทั้งแอป แต่{" "}
            <b>spinner กับ skeleton ถูกยกเว้นโดยตั้งใจ</b> — การหยุด spinner
            ที่รอบเดียวทำให้มันอ่านเป็น "คำขอค้าง" ซึ่งเป็นการลบข้อมูล ไม่ใช่ลบการ
            เคลื่อนไหว
          </>
        }
      >
        <DsRow label="button / a" hint="0.2s ease">
          <span className="text-micro-legal text-muted-foreground">
            background-color · color · box-shadow · transform · opacity
          </span>
        </DsRow>
        <DsRow label="active:scale-95" hint="ปุ่มตอนกด">
          <button
            type="button"
            className="rounded-md border bg-secondary px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
          >
            ลองกดค้าง
          </button>
        </DsRow>
        <DsRow label="animate-fade-in-up" hint="0.4s ease-out">
          <span className="animate-fade-in-up rounded-md bg-accent px-3 py-1.5 text-xs">
            เนื้อหาที่เพิ่งโหลดเสร็จ
          </span>
        </DsRow>
      </DsSection>
    </>
  );
}
