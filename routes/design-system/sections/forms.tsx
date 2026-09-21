import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DsSection, DsRow } from "../ds-kit";

export function FormsSection() {
  const baseId = useId();
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);

  return (
    <>
      <DsSection
        id="inputs"
        title="Text inputs"
        description={
          <>
            ความสูงมาตรฐานของ control ในแอปนี้คือ <code>size="sm"</code> (32px)
            ซึ่งเป็น <b>default ของ Input เอง</b> — ไม่ใช่ h-9 ตาม shadcn
            เพราะถ้าปล่อยตาม shadcn ช่องกรอกจะสูงกว่า DatePicker/LookupCombobox
            ในฟอร์มเดียวกัน 4px ทันทีที่ใครลืมระบุ
          </>
        }
        usage={
          <>
            ใส่ <code>maxLength</code> แล้วช่องจะขึ้นตัวนับให้เองตอน focus ·
            ทุกช่องต้องมี <code>Label</code> ที่ <code>htmlFor</code> ตรงกับ{" "}
            <code>id</code> — placeholder ไม่ใช่ label
          </>
        }
        code={`<div className="grid gap-1.5">
  <Label htmlFor="code">รหัสสินค้า</Label>
  <Input id="code" placeholder="เช่น SKU-0001" maxLength={20} />
</div>`}
      >
        <DsRow label='size="xs"' hint="24px">
          <Input size="xs" className="w-56" placeholder="ค้นหา" />
        </DsRow>
        <DsRow label='size="sm"' hint="32px · default">
          <Input className="w-56" placeholder="เช่น SKU-0001" maxLength={20} />
        </DsRow>
        <DsRow label='size="default"' hint="36px">
          <Input size="default" className="w-56" placeholder="ชื่อผู้ขาย" />
        </DsRow>
        <DsRow label="disabled">
          <Input className="w-56" defaultValue="แก้ไขไม่ได้" disabled />
        </DsRow>
        <DsRow label="aria-invalid">
          <Input className="w-56" defaultValue="ค่าที่ผิด" aria-invalid />
        </DsRow>
        <DsRow label="Textarea">
          <Textarea className="w-72" rows={3} placeholder="หมายเหตุ" />
        </DsRow>
        <DsRow label="Label">
          <div className="grid w-56 gap-1.5">
            <Label htmlFor={`${baseId}-lbl`}>รหัสสินค้า</Label>
            <Input id={`${baseId}-lbl`} placeholder="SKU-0001" />
          </div>
        </DsRow>
      </DsSection>

      <DsSection
        id="choice"
        title="Choice controls"
        description="Select / Checkbox / Radio / Switch — ทั้งหมดมาจาก Radix จึงรองรับคีย์บอร์ดและ screen reader มาตั้งแต่ต้น"
        usage={
          <>
            <b>Switch</b> ใช้กับค่าที่มีผลทันที (เปิด/ปิด) ·{" "}
            <b>Checkbox</b> ใช้กับค่าที่จะถูกบันทึกพร้อมฟอร์ม — ถ้าติ๊กแล้วยังต้อง
            กด Save ให้ใช้ checkbox ไม่ใช่ switch
          </>
        }
        code={`<Select defaultValue="kg">
  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="kg">กิโลกรัม</SelectItem>
  </SelectContent>
</Select>`}
      >
        <DsRow label="Select">
          <Select defaultValue="kg">
            <SelectTrigger className="w-44">
              <SelectValue placeholder="เลือกหน่วย" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">กิโลกรัม</SelectItem>
              <SelectItem value="pc">ชิ้น</SelectItem>
              <SelectItem value="box">กล่อง</SelectItem>
            </SelectContent>
          </Select>
        </DsRow>
        <DsRow label="Checkbox">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${baseId}-cb`}
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
            />
            <Label htmlFor={`${baseId}-cb`}>ใช้งานอยู่</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`${baseId}-cb2`} disabled />
            <Label htmlFor={`${baseId}-cb2`} className="text-muted-foreground">
              disabled
            </Label>
          </div>
        </DsRow>
        <DsRow label="RadioGroup">
          <RadioGroup defaultValue="all" className="flex gap-4">
            {[
              { v: "all", l: "ทั้งหมด" },
              { v: "active", l: "เฉพาะที่ใช้งาน" },
            ].map((o) => (
              <div key={o.v} className="flex items-center gap-2">
                <RadioGroupItem value={o.v} id={`${baseId}-${o.v}`} />
                <Label htmlFor={`${baseId}-${o.v}`}>{o.l}</Label>
              </div>
            ))}
          </RadioGroup>
        </DsRow>
        <DsRow label="Switch">
          <div className="flex items-center gap-2">
            <Switch id={`${baseId}-sw`} checked={on} onCheckedChange={setOn} />
            <Label htmlFor={`${baseId}-sw`}>รับการแจ้งเตือน</Label>
          </div>
          <Switch disabled />
        </DsRow>
      </DsSection>
    </>
  );
}
