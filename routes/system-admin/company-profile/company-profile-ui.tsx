import { Controller, type UseFormReturn, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BusinessUnitConfigItem } from "@/types/business-unit";
import type { BusinessSettingFormValues } from "./company-profile-form-schema";

type Form = UseFormReturn<BusinessSettingFormValues>;
type FormName = FieldPath<BusinessSettingFormValues>;

/** อ่าน error message ของ field (รองรับ nested path เช่น `amount_format.locales`) */
function fieldError(form: Form, name: FormName): string | undefined {
  let cur: unknown = form.formState.errors;
  for (const part of name.split(".")) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  const msg = (cur as { message?: unknown } | undefined)?.message;
  return typeof msg === "string" ? msg : undefined;
}

/**
 * Field read-only หนึ่งช่องในหน้า Business Setting
 *
 * แสดง label, คำอธิบายว่า field นี้คืออะไร (`description`) และค่าในกล่อง
 * disabled สีเทา (ว่าง = em dash) — `mono` สำหรับ UUID/ค่าเทคนิค,
 * `fullWidth` ให้ field กินเต็มแถว (เช่น address ที่ยาว)
 *
 * @param label - ชื่อ field
 * @param value - ค่า (string/number/null)
 * @param description - อธิบายว่า field นี้คืออะไร
 * @param mono - แสดงค่าด้วย font mono (UUID ฯลฯ)
 * @param fullWidth - กินเต็มความกว้าง 2 คอลัมน์
 * @param children - override การ render ค่า (เช่น badge, ปุ่ม reveal)
 */
export function SettingField({
  label,
  value,
  description,
  mono,
  fullWidth,
  children,
}: {
  readonly label: string;
  readonly value?: string | number | null;
  readonly description?: string;
  readonly mono?: boolean;
  readonly fullWidth?: boolean;
  readonly children?: React.ReactNode;
}) {
  const isEmpty =
    children == null && (value === null || value === undefined || value === "");
  return (
    <div className={cn("min-w-0 space-y-1", fullWidth && "sm:col-span-2")}>
      <div className="text-foreground text-xs font-semibold">{label}</div>
      {description && (
        <p className="text-muted-foreground/80 text-[0.6875rem] leading-snug">
          {description}
        </p>
      )}
      {children ?? (
        <div
          className={cn(
            "bg-muted/50 text-foreground min-h-8 rounded-md border px-3 py-1.5 text-sm break-words",
            mono && "font-mono text-xs",
            isEmpty && "text-muted-foreground/60",
          )}
        >
          {isEmpty ? "—" : value}
        </div>
      )}
    </div>
  );
}

/** โครง label + description + slot ของ field ในโหมด edit (ไม่มีกล่องค่า) */
function EditShell({
  label,
  description,
  htmlFor,
  fullWidth,
  children,
}: {
  readonly label: string;
  readonly description?: string;
  readonly htmlFor?: string;
  readonly fullWidth?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", fullWidth && "sm:col-span-2")}>
      <Label htmlFor={htmlFor} className="text-foreground text-xs font-semibold">
        {label}
      </Label>
      {description && (
        <p className="text-muted-foreground/80 text-[0.6875rem] leading-snug">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

/**
 * Field แก้ไขได้ — view = กล่อง read-only (`SettingField`), edit = input ผูก RHF
 *
 * @param editing - true = โหมดแก้ไข
 * @param type - text | number | textarea
 * @param displayValue - ค่าที่แสดงในโหมด view
 */
export function EditableField({
  editing,
  form,
  name,
  label,
  description,
  type = "text",
  displayValue,
  fullWidth,
  mono,
  maxLength,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly name: FormName;
  readonly label: string;
  readonly description?: string;
  readonly type?: "text" | "number" | "textarea";
  readonly displayValue?: string | number | null;
  readonly fullWidth?: boolean;
  readonly mono?: boolean;
  /** character-count cap (โชว์ counter). default: textarea 256 · text 100 */
  readonly maxLength?: number;
}) {
  if (!editing) {
    return (
      <SettingField
        label={label}
        description={description}
        value={displayValue}
        mono={mono}
        fullWidth={fullWidth}
      />
    );
  }
  const error = fieldError(form, name);
  // default cap ต่อชนิด — number ไม่ cap (counter ไม่ applicable)
  const resolvedMaxLength =
    maxLength ?? (type === "textarea" ? 256 : type === "text" ? 100 : undefined);
  return (
    <EditShell
      label={label}
      description={description}
      htmlFor={name}
      fullWidth={fullWidth}
    >
      {type === "textarea" ? (
        <Textarea
          id={name}
          maxLength={resolvedMaxLength}
          {...form.register(name)}
          aria-invalid={!!error}
          className="min-h-16 text-sm"
        />
      ) : (
        <Input
          id={name}
          type={type === "number" ? "number" : "text"}
          maxLength={resolvedMaxLength}
          {...form.register(name, { valueAsNumber: type === "number" })}
          aria-invalid={!!error}
          className={cn("h-8 text-sm", mono && "font-mono text-xs")}
        />
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </EditShell>
  );
}

/**
 * Select ผูก RHF (Controller) — คืนเฉพาะตัว control (ไม่มี label/shell)
 *
 * merge ค่าปัจจุบันเข้า options เผื่อ backend คืนค่านอกรายการ (จะได้ไม่หาย)
 */
function SelectControl({
  form,
  name,
  options,
  placeholder,
  id,
}: {
  readonly form: Form;
  readonly name: FormName;
  readonly options: readonly string[];
  readonly placeholder?: string;
  readonly id?: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => {
        const current = typeof field.value === "string" ? field.value : "";
        const merged =
          current && !options.includes(current) ? [current, ...options] : options;
        return (
          <Select value={current || undefined} onValueChange={field.onChange}>
            <SelectTrigger id={id} size="sm" className="w-full text-sm">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {merged.map((o) => (
                <SelectItem key={o} value={o} className="text-sm">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }}
    />
  );
}

/** Field แบบ dropdown (controlled) — view = กล่อง read-only */
export function SelectField({
  editing,
  form,
  name,
  label,
  description,
  options,
  placeholder,
  displayValue,
  fullWidth,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly name: FormName;
  readonly label: string;
  readonly description?: string;
  readonly options: readonly string[];
  readonly placeholder?: string;
  readonly displayValue?: string | number | null;
  readonly fullWidth?: boolean;
}) {
  if (!editing) {
    return (
      <SettingField
        label={label}
        description={description}
        value={displayValue}
        fullWidth={fullWidth}
      />
    );
  }
  return (
    <EditShell
      label={label}
      description={description}
      htmlFor={name}
      fullWidth={fullWidth}
    >
      <SelectControl
        form={form}
        name={name}
        options={options}
        placeholder={placeholder}
        id={name}
      />
    </EditShell>
  );
}

/**
 * Field number-format — view แสดงสรุป, edit = locales (dropdown) + minimumIntegerDigits
 *
 * @param localeOptions - รายการ locale มาตรฐานสำหรับ dropdown
 */
export function NumberFormatField({
  editing,
  form,
  name,
  label,
  description,
  displayValue,
  localeOptions,
  localesPlaceholder,
  digitsPlaceholder,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly name:
    | "amount_format"
    | "quantity_format"
    | "perpage_format"
    | "recipe_format";
  readonly label: string;
  readonly description?: string;
  readonly displayValue?: string | null;
  readonly localeOptions: readonly string[];
  readonly localesPlaceholder: string;
  readonly digitsPlaceholder: string;
}) {
  if (!editing) {
    return (
      <SettingField
        label={label}
        description={description}
        value={displayValue}
      />
    );
  }
  return (
    <EditShell label={label} description={description}>
      <div className="grid grid-cols-2 gap-2">
        <SelectControl
          form={form}
          name={`${name}.locales` as FormName}
          options={localeOptions}
          placeholder={localesPlaceholder}
        />
        <Input
          type="number"
          {...form.register(`${name}.minimumIntegerDigits` as FormName, {
            valueAsNumber: true,
          })}
          placeholder={digitsPlaceholder}
          className="h-8 text-sm"
        />
      </div>
    </EditShell>
  );
}

/**
 * Field ของ config หนึ่งรายการ — label มาจาก backend, value เก็บเป็น string เสมอ
 *
 * boolean → Switch, enum (มี options) → Select, อื่นๆ → text input. view แสดงค่าปัจจุบัน
 *
 * @param yesLabel/noLabel - ป้าย boolean ในโหมด view
 * @param label - override label ที่แสดง (เช่น i18n ของ seeded item); ไม่มี → ใช้ item.label
 * @param options - สำหรับ enum: รายการ {value,label} ที่ resolve แล้ว; ไม่มี → fallback text input
 */
export function ConfigField({
  editing,
  form,
  index,
  item,
  yesLabel,
  noLabel,
  label,
  options,
  disabled,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly index: number;
  readonly item: BusinessUnitConfigItem;
  readonly yesLabel: string;
  readonly noLabel: string;
  /** override display label (เช่น i18n ของ seeded item); ไม่มี → ใช้ item.label */
  readonly label?: string;
  /** สำหรับ enum — options ที่ resolve แล้ว (value + label i18n) */
  readonly options?: readonly { value: string; label: string }[];
  /** ปิดการแก้ไขชั่วคราว (เช่น options ยังโหลดไม่เสร็จ) */
  readonly disabled?: boolean;
}) {
  const isBool = item.datatype === "boolean";
  const isEnum = item.datatype === "enum" && options != null;
  const name = `config.${index}.value` as FormName;
  const displayLabel = label ?? item.label;

  if (!editing) {
    let displayValue: string;
    if (isBool) {
      displayValue = item.value === "true" ? yesLabel : noLabel;
    } else if (isEnum) {
      displayValue =
        options.find((o) => o.value === item.value)?.label ?? item.value;
    } else {
      displayValue = item.value;
    }
    return (
      <SettingField
        label={displayLabel}
        description={item.key}
        value={displayValue}
      />
    );
  }

  if (isBool) {
    return (
      <EditShell label={displayLabel} description={item.key}>
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <Switch
              checked={field.value === "true"}
              onCheckedChange={(v) => field.onChange(v ? "true" : "false")}
            />
          )}
        />
      </EditShell>
    );
  }

  if (isEnum) {
    return (
      <EditShell label={displayLabel} description={item.key} htmlFor={name}>
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <Select
              value={typeof field.value === "string" ? field.value : ""}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger id={name} size="sm" className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </EditShell>
    );
  }

  return (
    <EditShell label={displayLabel} description={item.key} htmlFor={name}>
      <Input {...form.register(name)} className="h-8 text-sm" />
    </EditShell>
  );
}
