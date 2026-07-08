import { Controller, type UseFormReturn, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BusinessUnitConfigItem } from "@/types/business-unit";
import type { BusinessSettingFormValues } from "./business-setting-form-schema";

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
 * โครงหนึ่ง section ของหน้า Business Setting — 2 คอลัมน์แบบหน้า settings
 *
 * ซ้าย = ชื่อ section + คำอธิบายสั้น, ขวา = grid ของ field (read-only)
 * มีเส้นคั่นด้านบนทุก section ยกเว้นอันแรก (คุมด้วย prop `first`)
 *
 * @param title - ชื่อ section
 * @param description - คำอธิบายสั้นว่า section นี้เกี่ยวกับอะไร
 * @param first - true = section แรก (ไม่มีเส้นคั่น/padding บน)
 * @param children - field ต่างๆ (ปกติเป็น <SettingField>)
 */
export function SettingSection({
  title,
  description,
  first,
  count,
  action,
  wide,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly first?: boolean;
  /** optional count shown after the title (e.g. rows in a dynamic section) */
  readonly count?: number;
  /** optional control shown under the description (e.g. an Add button) */
  readonly action?: React.ReactNode;
  /** body needs full width (e.g. a wide table) — title/desc stack on top */
  readonly wide?: boolean;
  readonly children: React.ReactNode;
}) {
  const heading = (
    <>
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {count !== undefined && (
          <span className="text-muted-foreground text-xs font-semibold tabular-nums">
            {count}
          </span>
        )}
      </div>
      {description && (
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {description}
        </p>
      )}
    </>
  );

  if (wide) {
    return (
      <section
        className={cn(
          "space-y-4",
          !first && "border-border/70 mt-8 border-t pt-8",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">{heading}</div>
          {action}
        </div>
        <div className="min-w-0">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "grid gap-x-10 gap-y-4 md:grid-cols-3",
        !first && "border-border/70 mt-8 border-t pt-8",
      )}
    >
      <div className="md:col-span-1">
        {heading}
        {action && <div className="mt-3">{action}</div>}
      </div>
      <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Skeleton ที่ mirror โครง `SettingSection` เป๊ะ — ใช้ตอน loading ให้ความสูง
 * เท่ากับเนื้อหาจริง โดยรับ `fields` เป็น layout ของแต่ละช่อง ("full" กินเต็มแถว
 * เหมือน field ที่ `sm:col-span-2`, "half" = ครึ่งแถว) reuse ได้ทุกหน้า settings
 */
export function SettingSectionSkeleton({
  first,
  fields,
}: {
  readonly first?: boolean;
  /** "half" = one grid cell · "full" = whole row · "tall" = full-row textarea */
  readonly fields: ReadonlyArray<"full" | "half" | "tall">;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-10 gap-y-4 md:grid-cols-3",
        !first && "border-border/70 mt-8 border-t pt-8",
      )}
    >
      <div className="space-y-2 md:col-span-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="grid gap-4 md:col-span-2 sm:grid-cols-2">
        {fields.map((w, j) => (
          <Skeleton
            key={j}
            className={cn(
              "w-full",
              w === "tall" ? "h-24" : "h-14",
              (w === "full" || w === "tall") && "sm:col-span-2",
            )}
          />
        ))}
      </div>
    </div>
  );
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
          {...form.register(name)}
          aria-invalid={!!error}
          className="min-h-16 text-sm"
        />
      ) : (
        <Input
          id={name}
          type={type === "number" ? "number" : "text"}
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

/** Switch ผูก RHF สำหรับ boolean field (is_active / is_hq) */
export function SwitchField({
  form,
  name,
  label,
}: {
  readonly form: Form;
  readonly name: "is_active";
  readonly label: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center gap-2">
          <Switch checked={field.value} onCheckedChange={field.onChange} />
          <span className="text-sm">{label}</span>
        </label>
      )}
    />
  );
}

/**
 * Field ของ config หนึ่งรายการ — label มาจาก backend, value เก็บเป็น string เสมอ
 *
 * boolean → Switch (checked = "true"), อื่นๆ → text input. view แสดงค่าปัจจุบัน
 *
 * @param yesLabel/noLabel - ป้าย boolean ในโหมด view
 */
export function ConfigField({
  editing,
  form,
  index,
  item,
  yesLabel,
  noLabel,
}: {
  readonly editing: boolean;
  readonly form: Form;
  readonly index: number;
  readonly item: BusinessUnitConfigItem;
  readonly yesLabel: string;
  readonly noLabel: string;
}) {
  const isBool = item.datatype === "boolean";
  const name = `config.${index}.value` as FormName;

  if (!editing) {
    return (
      <SettingField
        label={item.label}
        description={item.key}
        value={isBool ? (item.value === "true" ? yesLabel : noLabel) : item.value}
      />
    );
  }

  if (isBool) {
    return (
      <EditShell label={item.label} description={item.key}>
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

  return (
    <EditShell label={item.label} description={item.key} htmlFor={name}>
      <Input {...form.register(name)} className="h-8 text-sm" />
    </EditShell>
  );
}
