import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DsSection, DsRow } from "../ds-kit";

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "success",
  "info",
  "warning",
  "link",
] as const;

const SIZES = [
  { size: "xs", h: "24px" },
  { size: "sm", h: "32px" },
  { size: "default", h: "36px" },
  { size: "lg", h: "40px" },
] as const;

const ICON_SIZES = [
  { size: "icon-xs", h: "24px" },
  { size: "icon-sm", h: "32px" },
  { size: "icon", h: "36px" },
  { size: "icon-lg", h: "40px" },
] as const;

export function ButtonsSection() {
  return (
    <>
      <DsSection
        id="buttons"
        title="Button — variants"
        description={
          <>
            <code>components/ui/button.tsx</code> · รัศมี <code>rounded-md</code>{" "}
            · ตัวอักษร 14px/600/tracking-tight · กดแล้วย่อเป็น{" "}
            <code>scale(0.95)</code> · focus เป็นวง 2px บน <code>--ring</code>
          </>
        }
        usage={
          <>
            <b>accent เดียวต่อหนึ่งหน้าจอ:</b> ปุ่ม <code>default</code>{" "}
            คือ "กดอันนี้" — มีได้หนึ่งอันต่อกลุ่ม ที่เหลือเป็น{" "}
            <code>outline</code> / <code>ghost</code> ·{" "}
            variant ที่มีพื้นทึบพก hairline <code>border-black/10</code>{" "}
            มาด้วยเพื่อให้พื้นสียังมีขอบเมื่อวางบนพื้นสี
          </>
        }
        code={`<Button>บันทึก</Button>
<Button variant="outline" size="sm">ยกเลิก</Button>
<Button variant="destructive" size="sm"><Trash2 /> ลบ</Button>`}
      >
        {VARIANTS.map((v) => (
          <DsRow key={v} label={`variant="${v}"`}>
            <Button variant={v}>บันทึก</Button>
            <Button variant={v} disabled>
              disabled
            </Button>
            <Button variant={v} size="sm">
              <Plus /> เพิ่มรายการ
            </Button>
          </DsRow>
        ))}
      </DsSection>

      <DsSection
        id="button-sizes"
        title="Button — sizes"
        description="ขนาดผูกกับความหนาแน่นของบริบท ไม่ใช่กับความสำคัญ — แถวในตารางใช้ xs/sm, toolbar ของฟอร์มใช้ default"
        code={`<Button size="xs" variant="ghost"><Check /></Button>
<Button size="icon-sm" variant="outline" aria-label="ลบ"><Trash2 /></Button>`}
      >
        {SIZES.map((s) => (
          <DsRow key={s.size} label={`size="${s.size}"`} hint={s.h}>
            <Button size={s.size}>บันทึก</Button>
            <Button size={s.size} variant="outline">
              <Check /> ยืนยัน
            </Button>
          </DsRow>
        ))}
        {ICON_SIZES.map((s) => (
          <DsRow key={s.size} label={`size="${s.size}"`} hint={s.h}>
            <Button size={s.size} aria-label="เพิ่ม">
              <Plus />
            </Button>
            <Button size={s.size} variant="outline" aria-label="ลบ">
              <Trash2 />
            </Button>
            <Button size={s.size} variant="ghost" aria-label="ยืนยัน">
              <Check />
            </Button>
          </DsRow>
        ))}
      </DsSection>
    </>
  );
}
