import { Badge } from "@/components/ui/badge";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { DsSection, DsRow } from "../ds-kit";

const SOLID = [
  "default",
  "secondary",
  "destructive",
  "success",
  "info",
  "warning",
  "invert",
] as const;

const LIGHT = [
  "primary-light",
  "destructive-light",
  "success-light",
  "info-light",
  "warning-light",
  "invert-light",
] as const;

const OUTLINE = [
  "outline",
  "primary-outline",
  "destructive-outline",
  "success-outline",
  "info-outline",
  "warning-outline",
  "invert-outline",
] as const;

const SIZES = ["xs", "sm", "default", "lg", "xl"] as const;

export function BadgesSection() {
  return (
    <>
      <DsSection
        id="badges"
        title="Badge — solid"
        description={
          <>
            <code>components/ui/badge.tsx</code> · พื้นทึบเต็มสี
            เก็บไว้ใช้เฉพาะที่ชิปต้อง "รอด" จากการกวาดตาผ่านเร็ว ๆ
          </>
        }
        code={`<Badge variant="success" size="sm">อนุมัติแล้ว</Badge>`}
      >
        <DsRow label="solid">
          {SOLID.map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
        </DsRow>
      </DsSection>

      <DsSection
        id="badges-light"
        title="Badge — light & outline"
        description={
          <>
            ชุด <code>-light</code> คือคำตอบของกฎ "avoid neon" — กล่องเป็นสีกลาง
            (<code>bg-muted</code>) และสีปรากฏ <b>ครั้งเดียว</b> ที่ตัวอักษร
            (ผ่าน <code>-ink</code> ที่ผ่าน contrast)
          </>
        }
        usage={
          <>
            ในแถวที่หนาแน่นให้หยิบ <code>-light</code> ก่อนเสมอ
            พื้นทึบหลายชิปในแถวเดียวจะกลายเป็นแถบสีที่แย่งสายตากับตัวเลข
          </>
        }
        code={`<Badge variant="warning-light" size="xs">รอตรวจรับ</Badge>
<Badge variant="info-outline" size="xs">GRN</Badge>`}
      >
        <DsRow label="-light">
          {LIGHT.map((v) => (
            <Badge key={v} variant={v}>
              {v.replace("-light", "")}
            </Badge>
          ))}
        </DsRow>
        <DsRow label="-outline">
          {OUTLINE.map((v) => (
            <Badge key={v} variant={v}>
              {v.replace("-outline", "")}
            </Badge>
          ))}
        </DsRow>
      </DsSection>

      <DsSection
        id="badge-sizes"
        title="Badge — sizes & status dot"
        description={
          <>
            <code>StatusDotBadge</code> คือรูปแบบมาตรฐานของสถานะทั้งแอป — ชิป
            สีกลางกับจุดสี ตัว label ไม่ย้อมสี ทำให้ list กับ grid
            แสดงสถานะเหมือนกันเมื่อสลับมุมมอง
          </>
        }
        usage={
          <>
            <b>กับดักใน DataGrid:</b> กฎใน globals.css บีบ badge ทุกตัวในตาราง
            ให้เหลือ 8px การไปแก้ prop <code>size</code> ที่คอมโพเนนต์จึงไม่มีผล
            ในตาราง (มีผลแต่ใน card view) — ชิปสถานะติด{" "}
            <code>data-status-chip</code> เพื่อขอออกจากกฎนั้น
          </>
        }
        code={`<StatusDotBadge tone="success" size="sm">อนุมัติแล้ว</StatusDotBadge>
<StatusDotBadge tone="neutral" size="xs">ร่าง</StatusDotBadge>`}
      >
        {SIZES.map((s) => (
          <DsRow key={s} label={`size="${s}"`}>
            <Badge size={s}>12</Badge>
            <Badge size={s} variant="success-light">
              อนุมัติแล้ว
            </Badge>
          </DsRow>
        ))}
        <DsRow label="StatusDotBadge" hint="tone × size">
          {(["success", "info", "warning", "destructive", "neutral"] as const).map(
            (tone) => (
              <StatusDotBadge key={tone} tone={tone} size="sm">
                {tone}
              </StatusDotBadge>
            ),
          )}
        </DsRow>
      </DsSection>
    </>
  );
}
