import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { InputGroup } from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Fieldset wrapper สำหรับกลุ่ม field
 *
 * Render `<fieldset>` ที่จัด flex column รองรับ checkbox/radio group
 * (ปรับ gap อัตโนมัติ) ใช้สำหรับจัดกลุ่ม field ที่เกี่ยวข้องกันใน semantic
 *
 * @param props - props ของ `<fieldset>` element
 * @returns JSX element ของ fieldset
 * @example
 * ```tsx
 * <FieldSet><FieldLegend>Address</FieldLegend>...</FieldSet>
 * ```
 */
function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-6",
        "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Legend ของ FieldSet
 *
 * Render `<legend>` หัวเรื่องของ FieldSet รองรับ variant `legend` (text-base)
 * หรือ `label` (text-sm) ผ่าน data attribute
 *
 * @param props - props ของ legend
 * @param props.variant - "legend" หรือ "label"
 * @returns JSX element ของ legend
 * @example
 * ```tsx
 * <FieldLegend variant="label">Personal info</FieldLegend>
 * ```
 */
function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-3 font-semibold",
        "data-[variant=legend]:text-base",
        "data-[variant=label]:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Group container ของ Field หลายรายการ
 *
 * Render `<div>` flex column ที่มี gap-7 (default) ระหว่าง Field รองรับ
 * container query (`@container/field-group`) ให้ Field child ปรับ orientation
 * ตามขนาดของ group
 *
 * @param props - props ของ div
 * @returns JSX element ของ field group
 * @example
 * ```tsx
 * <FieldGroup className="gap-3"><Field>...</Field></FieldGroup>
 * ```
 */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva(
  "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
        horizontal: [
          "flex-row items-center",
          "[&>[data-slot=field-label]]:flex-auto",
          "has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
        responsive: [
          "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto",
          "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
          "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  },
);

/**
 * Field หนึ่งช่องของฟอร์ม
 *
 * Render `<div role="group">` ที่ครอบ FieldLabel + control + FieldError
 * รองรับ orientation `vertical` (default), `horizontal` หรือ `responsive`
 * (vertical บนจอเล็กแล้วเปลี่ยนเป็น horizontal บน @md ของ container query)
 * เพิ่ม `data-invalid="true"` เพื่อให้ child element เปลี่ยนสี destructive
 *
 * @param props - props ของ field
 * @param props.orientation - vertical/horizontal/responsive
 * @returns JSX element ของ field
 * @example
 * ```tsx
 * <Field orientation="horizontal">
 *   <FieldLabel>Active</FieldLabel>
 *   <Switch />
 * </Field>
 * ```
 */
function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

/**
 * Content container ภายใน Field
 *
 * Render `<div>` flex column ที่ครอบ label + description + control เป็นกลุ่ม
 * เดียวภายใน Field มักใช้กับ horizontal orientation พร้อม checkbox/radio
 *
 * @param props - props ของ div
 * @returns JSX element ของ field content
 * @example
 * ```tsx
 * <Field orientation="horizontal">
 *   <Checkbox />
 *   <FieldContent>
 *     <FieldLabel>Subscribe</FieldLabel>
 *     <FieldDescription>Receive emails</FieldDescription>
 *   </FieldContent>
 * </Field>
 * ```
 */
function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Label ของ Field
 *
 * Render Radix `Label` ที่ใส่ data attribute สำหรับ disabled state ของ Field
 * พ่อ และเพิ่มเครื่องหมาย `*` สีแดงเมื่อ `required` รองรับ embed `<Field>`
 * เพื่อทำ card-style label
 *
 * @param props - props ของ label
 * @param props.required - แสดงเครื่องหมาย required
 * @returns JSX element ของ label
 * @example
 * ```tsx
 * <FieldLabel htmlFor="email" required>Email</FieldLabel>
 * ```
 */
function FieldLabel({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof Label> & { required?: boolean }) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-1 text-xs leading-snug group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-4",
        "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive">*</span>}
    </Label>
  );
}

/**
 * Title ของ Field (ขนาดใหญ่กว่า label)
 *
 * Render `<div>` หัวเรื่อง text-sm font-semibold ใช้ข้างใน Field สำหรับ
 * section heading ที่ไม่ใช่ label ของ input โดยตรง
 *
 * @param props - props ของ div
 * @returns JSX element ของ field title
 * @example
 * ```tsx
 * <FieldTitle>Notification settings</FieldTitle>
 * ```
 */
function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm leading-snug font-semibold group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Description ของ Field
 *
 * Render `<p>` คำอธิบายย่อยสีเทา รองรับ link styling อัตโนมัติ ใช้ใต้
 * FieldLabel เพื่ออธิบายเพิ่มเติม
 *
 * @param props - props ของ paragraph
 * @returns JSX element ของ description
 * @example
 * ```tsx
 * <FieldDescription>This will be visible to other users.</FieldDescription>
 * ```
 */
function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-muted-foreground text-sm leading-normal font-normal group-has-data-[orientation=horizontal]/field:text-balance",
        "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
        "[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Separator ระหว่างกลุ่ม Field
 *
 * Render เส้นคั่นแนวนอน หากมี `children` จะ render text overlay ตรงกลาง
 * (เช่น "OR") ใช้สำหรับแบ่ง section ภายใน FieldGroup
 *
 * @param props - props ของ div
 * @param props.children - ข้อความ overlay ตรงกลาง (optional)
 * @returns JSX element ของ separator
 * @example
 * ```tsx
 * <FieldSeparator>OR</FieldSeparator>
 * ```
 */
function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error) =>
            error?.message && <li key={error.message}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-destructive text-sm font-normal", className)}
      {...props}
    >
      {content}
    </div>
  );
}

/**
 * Input ที่ฝัง error tooltip
 *
 * Render `Input` ที่แสดงไอคอน Ban สีแดงด้านขวาเมื่อมี error และเปิด tooltip
 * บอก error message เมื่อ hover/focus เหมาะสำหรับ compact layout ที่ไม่อยาก
 * ใช้พื้นที่แสดง FieldError ด้านล่าง stop propagation ของ focus event เพื่อ
 * ป้องกัน parent reset
 *
 * @param props - props ของ Input + error
 * @param props.error - ข้อความ error (ถ้ามี)
 * @returns JSX element ของ input wrapper
 * @example
 * ```tsx
 * <FieldInput error={errors.code?.message} {...register("code")} />
 * ```
 */
function FieldInput({
  error,
  errorIconAlign = "right",
  className,
  onFocus,
  ...props
}: React.ComponentProps<typeof Input> & {
  error?: string;
  errorIconAlign?: "left" | "right";
}) {
  const isLeft = errorIconAlign === "left";
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="relative">
            <Input
              aria-invalid={!!error}
              className={className}
              onFocus={(e) => {
                e.stopPropagation();
                onFocus?.(e);
              }}
              {...props}
            />
            {!!error && (
              <CircleAlert
                aria-hidden="true"
                className={cn(
                  "text-destructive pointer-events-none absolute top-1/2 size-4 -translate-y-1/2",
                  isLeft ? "left-2.5" : "right-2.5",
                )}
              />
            )}
          </div>
        </TooltipTrigger>
        {!!error && (
          <TooltipContent
            side="top"
            align={isLeft ? "start" : "end"}
            className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
          >
            {error}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function FieldSelect({
  error,
  className,
  placeholder,
  size = "default",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Select>, "children"> & {
  error?: string;
  className?: string;
  placeholder?: string;
  size?: "xs" | "sm" | "default";
  children?: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="relative">
            <Select {...props}>
              <SelectTrigger
                aria-invalid={!!error}
                size={size}
                className={cn(
                  "w-full",
                  error && "pr-7 [&>svg:last-child]:hidden",
                  className,
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              {children}
            </Select>
            {!!error && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-end pr-2">
                <CircleAlert
                  className="text-destructive size-4"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        {!!error && (
          <TooltipContent
            side="top"
            align="end"
            className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
          >
            {error}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function FieldDatePicker({
  error,
  className,
  hideClear,
  ...props
}: React.ComponentProps<typeof DatePicker> & { error?: string }) {
  // readOnly render เป็น plain text → ไม่ต้องโชว์ error UI (ไอคอน/เส้นแดง/tooltip)
  const showError = !!error && !props.readOnly;
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="relative">
            <DatePicker
              className={cn(
                className,
                // important: ชนะ `dark:border-input` ของ Button outline
                // (specificity 0,2,0 จาก dark variant `:is(.dark *)`)
                showError && "border-destructive!",
              )}
              invalid={showError}
              hideClear={hideClear || !!error}
              {...props}
            />
            {showError && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-end pr-2">
                <CircleAlert
                  className="text-destructive size-4"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        {showError && (
          <TooltipContent
            side="top"
            align="end"
            className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
          >
            {error}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function FieldInputGroup({
  error,
  className,
  children,
  ...props
}: React.ComponentProps<typeof InputGroup> & { error?: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div className="relative">
            <InputGroup
              aria-invalid={!!error}
              className={cn(error && "border-destructive pl-7", className)}
              {...props}
            >
              {children}
            </InputGroup>
            {!!error && (
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                <CircleAlert
                  className="text-destructive size-4"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        {!!error && (
          <TooltipContent
            side="top"
            align="end"
            className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
          >
            {error}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ค่าของ field แบบ plain text สำหรับ view mode — แทน input ด้วยข้อความอ่านอย่างเดียว
 *
 * value เด่น (text-foreground / medium) ให้เกิด lightness+size contrast เหนือ
 * label ที่เงียบ (แบบ CN/PO/GRN) จัดแนวตั้งด้วย min-h-8 ให้สูงเท่าแถว input
 * ค่าว่าง/undefined จะแสดง em dash "—" อัตโนมัติ ขนาด default text-sm ปรับผ่าน
 * className ได้ (เช่น "text-xs" ให้ตรงกับ field ที่ใช้ text-xs)
 *
 * @param children - ค่าที่จะแสดง (ว่าง → "—")
 * @param className - class เสริม (override ขนาด/สี/แนว)
 * @returns JSX element ของข้อความ
 * @example
 * ```tsx
 * <FieldPlainText>{form.getValues("invoice_no")}</FieldPlainText>
 * ```
 */
function FieldPlainText({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="field-plain-text"
      className={cn(
        "text-foreground inline-flex min-h-8 items-center text-xs font-medium",
        className,
      )}
      {...props}
    >
      {children || "—"}
    </span>
  );
}

export {
  Field,
  FieldDatePicker,
  FieldInputGroup,
  FieldPlainText,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldInput,
  FieldLegend,
  FieldSelect,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};
