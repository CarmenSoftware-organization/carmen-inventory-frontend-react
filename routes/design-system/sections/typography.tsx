import { DsSection, DsRow } from "../ds-kit";

/** ladder ที่ tokenise ไว้จริง — ทุกค่าอยู่ใน `@theme` ของ styles/globals.css */
const GOVERNED = [
  {
    cls: "text-micro-floor",
    px: "8px",
    note: "พื้นที่แคบที่สุดเท่านั้น (HeroCell, badge ในตาราง) ตัวพิมพ์ใหญ่/ตัวเลข",
    extra: "font-semibold uppercase",
  },
  {
    cls: "text-micro-eyebrow",
    px: "9px",
    note: "eyebrow ของ chip/badge — จุดเดียวที่อนุญาตให้ต่ำกว่า 10px",
    extra: "font-semibold uppercase tracking-[0.04em]",
  },
  {
    cls: "text-micro-legal",
    px: "10px",
    note: "meta ในบรรทัด, timestamp, caption",
    extra: "",
  },
  {
    cls: "text-micro",
    px: "11px",
    note: "ขนาดหลักของงานหนาแน่น — count chip, ตัวเลขตาราง (คู่กับ tabular-nums)",
    extra: "",
  },
  {
    cls: "text-fine-print",
    px: "12px",
    note: "body หนาแน่นและ label ของฟอร์ม — ขนาดเท่า text-xs ซึ่งแอปใช้มากกว่ามาก",
    extra: "",
  },
];

/** ปลายบนของ ladder — เป็น Tailwind step ปกติ ไม่มี token เฉพาะ */
const DISPLAY = [
  { cls: "text-xs", px: "12px", note: "การสะกดหลักของแอป (~775 จุด)" },
  { cls: "text-sm", px: "14px", note: "body, เนื้อ dialog, label ปุ่ม" },
  { cls: "text-base", px: "16px", note: "อ่านสบาย — ใช้น้อย" },
  { cls: "text-lg", px: "18px", note: "หัวการ์ด/หัวข้อย่อย" },
  { cls: "text-xl", px: "20px", note: "หัวข้อ" },
  { cls: "text-2xl", px: "24px", note: "ชื่อหน้า" },
  { cls: "text-3xl", px: "30px", note: "หน้า landing ของโมดูล" },
];

export function TypographySection() {
  return (
    <>
      <DsSection
        id="type-ladder"
        title="Type ladder — governed tier"
        description={
          <>
            ระบบนี้ไล่ชื่อ <b>จากปลายเล็กขึ้นบน</b> ซึ่งเป็นสิ่งที่ทำให้มันเป็น type
            system ของ ERP ไม่ใช่ของเว็บการตลาด — 97% ของข้อความในแอปอยู่ที่ 12px
            หรือต่ำกว่า ส่วนที่ถูกคุมด้วย token คือชั้นนี้ทั้งหมด
          </>
        }
        usage={
          <>
            token ให้แค่ <b>ขนาด + line-height ที่ปลอดภัย</b> เท่านั้น — ไม่ให้
            น้ำหนัก ไม่ให้ตัวพิมพ์ ไม่ให้ tracking เพราะการฝังค่าพวกนั้นไว้ใน{" "}
            <code>text-*</code> จะไปเปลี่ยนหน้าตาของ call site ที่ไม่ได้สั่งเอง ·{" "}
            <b>line-height ไม่ใช่ 1.0 ตามต้นฉบับ</b> เพราะภาษาไทยซ้อนสระบน +
            วรรณยุกต์สองชั้น ซึ่งจะถูกตัดหัว · เขียนขนาดดิบเองอย่าง{" "}
            <code>text-[…px]</code>{" "}
            เองถือเป็นบั๊ก design system
          </>
        }
        code={`<span className="text-micro tabular-nums">1,240.00</span>
<span className="text-micro-eyebrow font-semibold uppercase tracking-[0.04em]">
  รออนุมัติ
</span>`}
      >
        {GOVERNED.map((t) => (
          <DsRow key={t.cls} label={t.cls} hint={t.px}>
            <span className={`${t.cls} ${t.extra}`}>
              สร้างใบขอซื้อ Purchase Request 1,240.00
            </span>
            <span className="text-micro-legal text-muted-foreground">
              {t.note}
            </span>
          </DsRow>
        ))}
      </DsSection>

      <DsSection
        id="type-display"
        title="Type ladder — display tier"
        description="ปลายบนไม่มี token ของตัวเอง ใช้ step ของ Tailwind ตรง ๆ และใช้น้อยมากโดยตั้งใจ"
        usage={
          <>
            <b>ค่า base ที่สืบทอด = 17px</b> (<code>body</code> ใน globals.css)
            ซึ่งสูงกว่าที่แอปทำงานจริงห้าขั้น เกือบทุก element จึง override ทับ —
            ค่านี้ถูกปล่อยไว้โดยตั้งใจ อย่าไปเล็งใช้มันเป็นขั้นหนึ่งของ ladder
          </>
        }
      >
        {DISPLAY.map((t) => (
          <DsRow key={t.cls} label={t.cls} hint={t.px}>
            <span className={`${t.cls} font-semibold tracking-tight`}>
              ใบขอซื้อ
            </span>
            <span className="text-micro-legal text-muted-foreground">
              {t.note}
            </span>
          </DsRow>
        ))}
      </DsSection>

      <DsSection
        id="type-font"
        title="Font stack"
        description={
          <>
            สแต็กแบบ system-first — SF Pro บนแพลตฟอร์ม Apple, Inter/system
            ที่เหลือ และ <b>ต่อท้ายด้วยฟอนต์ไทย</b> เพราะ font fallback
            ทำงานทีละ glyph: ละตินยังได้ SF Pro ส่วนไทยตกไปที่หน้าแรกที่มีจริง
          </>
        }
        usage={
          <>
            ถ้าไม่ระบุฟอนต์ไทยไว้ OS แต่ละตัวจะเลือกคนละหน้า (Thonburi บน macOS,
            Leelawadee UI บน Windows, Noto บน Android) — สาม metric แนวตั้งที่
            ไม่ตรงกัน
          </>
        }
      >
        <DsRow label="--font-sans" hint="ข้อความทั้งแอป">
          <span className="text-lg">
            The quick brown fox · ใบขอซื้อรออนุมัติ 1,240.00
          </span>
        </DsRow>
        <DsRow label="--font-mono" hint="โค้ด, รหัสเอกสาร">
          <span className="font-mono text-lg">PR-2026-000142</span>
        </DsRow>
        <DsRow label="font-scale" hint="ผู้ใช้ปรับได้เอง">
          <span className="text-micro-legal text-muted-foreground">
            ห้าระดับที่ <code>html</code> (93.75 / 100 / 112.5 / 125 / 137.5%) —
            หน่วยเป็น % ไม่ใช่ px เพื่อไม่ทับค่า font size ที่ผู้ใช้ตั้งไว้ใน
            browser (WCAG 1.4.4) ทั้ง ladder และระยะที่วัดเป็น rem จึงกวาดตาม
            พร้อมกัน แต่ breakpoint ของ Tailwind ไม่ขยับตาม
          </span>
        </DsRow>
      </DsSection>
    </>
  );
}
