import { DsSection } from "../ds-kit";

/**
 * 41 ค่าของ palette สถานะเอกสาร (`styles/badge-status.css`)
 *
 * คนละระบบกับสี semantic โดยเจตนา — "เอกสารถูกปฏิเสธ" ไม่ใช่ข้อเท็จจริงชนิด
 * เดียวกับ "ช่องนี้กรอกผิด" จึงห้ามเอาสองชุดมาปนกัน
 */
const LIFECYCLE = [
  { t: "draft", th: "ร่าง" },
  { t: "pending", th: "รอดำเนินการ" },
  { t: "submitted", th: "ส่งแล้ว" },
  { t: "sent", th: "ส่งออกแล้ว" },
  { t: "open", th: "เปิดอยู่" },
  { t: "in-progress", th: "กำลังดำเนินการ" },
  { t: "review", th: "ส่งกลับทบทวน" },
  { t: "partial", th: "บางส่วน" },
  { t: "save", th: "บันทึกไว้" },
  { t: "approved", th: "อนุมัติแล้ว" },
  { t: "completed", th: "เสร็จสิ้น" },
  { t: "committed", th: "ผูกพันแล้ว" },
  { t: "rejected", th: "ปฏิเสธ" },
  { t: "cancelled", th: "ยกเลิก" },
  { t: "closed", th: "ปิด" },
  { t: "locked", th: "ล็อก" },
  { t: "voided", th: "ยกเลิกทิ้ง" },
];

const MOVEMENT = [
  { t: "stock-in", th: "รับเข้า" },
  { t: "stock-out", th: "จ่ายออก" },
  { t: "grn-po", th: "GRN จาก PO" },
  { t: "grn-manual", th: "GRN มือ" },
  { t: "quantity-return", th: "คืนของ" },
  { t: "amount-discount", th: "ส่วนลด" },
];

const CUISINE = [
  { t: "cuisine-asia", th: "เอเชีย" },
  { t: "cuisine-europe", th: "ยุโรป" },
  { t: "cuisine-americas", th: "อเมริกา" },
  { t: "cuisine-africa", th: "แอฟริกา" },
  { t: "cuisine-middle-east", th: "ตะวันออกกลาง" },
  { t: "cuisine-oceania", th: "โอเชียเนีย" },
];

function StatusChip({ token, label }: Readonly<{ token: string; label: string }>) {
  return (
    <div className="flex w-40 items-center gap-2 rounded-md bg-muted px-2 py-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: `var(--status-${token})` }}
      />
      <span className="truncate text-micro">{label}</span>
    </div>
  );
}

export function StatusPaletteSection() {
  return (
    <DsSection
      id="status-palette"
      title="Document status palette"
      description={
        <>
          41 ค่าใน <code>styles/badge-status.css</code> ผูกฮิวกับความหมายตาม
          ธรรมเนียม ERP (เทา = ยังไม่เริ่ม · น้ำเงิน = ส่งแล้ว · เหลือง =
          กำลังทำ · เขียว = อนุมัติ · แดง = ปฏิเสธ) ทุกค่ามีคู่{" "}
          <code>-fg</code> และบางค่ามี <code>-soft</code> / <code>-ink</code>
        </>
      }
      usage={
        <>
          <b>กับดักที่ต้องจำ:</b> utility <code>bg-status-*</code>{" "}
          <b>ไม่มีอยู่จริง</b> — บล็อก <code>@theme inline</code>{" "}
          ท้าย badge-status.css เป็นโค้ดที่ไม่มีผล ใช้{" "}
          <code>bg-[var(--status-draft)]</code> หรือ{" "}
          <code>style=&#123;&#123; background: "var(--status-draft)" &#125;&#125;</code>{" "}
          เท่านั้น · <code>--highlight</code> ไม่ใช่สีสถานะ ห้ามเอาไปแปลว่า
          warning
        </>
      }
      code={`<span
  className="size-2 rounded-full"
  style={{ background: "var(--status-approved)" }}
/>`}
    >
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-micro-eyebrow font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            วงจรเอกสาร
          </h3>
          <div className="flex flex-wrap gap-2">
            {LIFECYCLE.map((s) => (
              <StatusChip key={s.t} token={s.t} label={s.th} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-micro-eyebrow font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            การเคลื่อนไหวสินค้า
          </h3>
          <div className="flex flex-wrap gap-2">
            {MOVEMENT.map((s) => (
              <StatusChip key={s.t} token={s.t} label={s.th} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-micro-eyebrow font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            ภูมิภาคอาหาร
          </h3>
          <div className="flex flex-wrap gap-2">
            {CUISINE.map((s) => (
              <StatusChip key={s.t} token={s.t} label={s.th} />
            ))}
          </div>
        </div>
      </div>
    </DsSection>
  );
}
