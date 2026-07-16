import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * ช่องกรอกข้อความของ interface form
 *
 * @param props.field - ผลของ `form.register("...")`
 * @param props.hint - ข้อความช่วยใต้ช่อง (เช่นบอกว่า api_key ที่เป็น mask ไม่ต้องพิมพ์ใหม่)
 * @returns React element ของ text field
 */
export function TextField({
  label,
  field,
  error,
  placeholder,
  type,
  hint,
  className,
}: {
  readonly label: string;
  readonly field: UseFormRegisterReturn;
  readonly error?: string;
  readonly placeholder?: string;
  readonly type?: "text" | "password";
  readonly hint?: string;
  readonly className?: string;
}) {
  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Input {...field} type={type} placeholder={placeholder} />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/**
 * ช่องเลือกค่าจากชุดที่กำหนดไว้ (enum ของ zod schema)
 *
 * รับ label กับ value ไม่ได้รับ schema — แต่ละ form ยังประกาศ field ของตัวเองอยู่
 * ตัวนี้แค่ห่อรูปแบบ Select ที่ทั้งสาม form เขียนเหมือนกัน
 *
 * @param props.optionLabel - แปลง option เป็นข้อความที่แสดง (ปกติเป็น `t()`)
 * @returns React element ของ enum field
 */
export function EnumField<T extends string>({
  label,
  value,
  options,
  optionLabel,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly optionLabel: (option: T) => string;
  readonly onChange: (next: T) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger size="sm" className="w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-sm">
              {optionLabel(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * สวิตช์เปิด/ปิดของ interface form — กินความกว้างเต็มแถว
 *
 * @returns React element ของ toggle field
 */
export function ToggleField({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 pt-1 sm:col-span-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
