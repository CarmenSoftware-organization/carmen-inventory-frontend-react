import {
  Controller,
  useWatch,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { FieldInput, FieldPlainText } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { cn } from "@/lib/utils";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { PltFormValues } from "./plt-form-schema";

export type DetailField = FieldArrayWithId<PltFormValues, "details", "id">;
export type ProductRef = NonNullable<PriceListTemplate["products"]>[number];

interface CellProps {
  readonly form: UseFormReturn<PltFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
}

/* ── Cells (view = plain text · edit = inputs/lookups) ─────────── */

export function ProductCell({
  form,
  index,
  isView,
  isDisabled,
  productRef,
  confirmDuplicate,
}: CellProps & {
  readonly productRef?: ProductRef;
  readonly confirmDuplicate: (action: () => void, productName?: string) => void;
}) {
  "use no memo";
  const errors = form.formState.errors.details?.[index];
  if (isView)
    return (
      <NameWithSubtext
        primary={productRef?.product_name ?? ""}
        secondary={productRef?.product_code}
      />
    );
  return (
    <Controller
      control={form.control}
      name={`details.${index}.product_id`}
      render={({ field }) => (
        <LookupProduct
          value={field.value}
          onValueChange={(id, product) => {
            const rows = form.getValues("details");
            const isDup =
              !!id && rows.some((r, i) => i !== index && r.product_id === id);
            if (isDup)
              confirmDuplicate(() => field.onChange(id), product?.name);
            else field.onChange(id);
          }}
          disabled={isDisabled}
          className="h-8 w-full text-xs"
          error={errors?.product_id?.message}
        />
      )}
    />
  );
}

export function UnitCell({ form, index, isView, isDisabled }: CellProps) {
  "use no memo";
  const productId =
    useWatch({
      control: form.control,
      name: `details.${index}.product_id`,
    }) ?? "";
  const unitName =
    useWatch({
      control: form.control,
      name: `details.${index}.unit_name`,
    }) ?? "";
  const errors = form.formState.errors.details?.[index];
  if (isView) return <FieldPlainText>{unitName}</FieldPlainText>;
  return (
    <Controller
      control={form.control}
      name={`details.${index}.unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            if (unit?.name) {
              form.setValue(`details.${index}.unit_name`, unit.name);
            }
          }}
          disabled={isDisabled}
          className="w-full text-xs"
          error={errors?.unit_id?.message}
        />
      )}
    />
  );
}

export function QtyCell({ form, index, isView, isDisabled }: CellProps) {
  "use no memo";
  const qty = useWatch({
    control: form.control,
    name: `details.${index}.qty`,
  });
  const errors = form.formState.errors.details?.[index];

  // MOQ qty ของ product เดียวกันห้ามซ้ำ — กรอกชนกับ tier อื่น ให้บวกขึ้นจนว่าง
  // (เช็คตอน blur ไม่ใช่ทุกคีย์ ไม่งั้นพิมพ์เลขที่ยังไม่เสร็จจะเด้งหนี)
  const dedupeQty = () => {
    const rows = form.getValues("details");
    const self = rows[index];
    if (!self) return;
    let q = Number(self.qty) || 0;
    if (q <= 0) return;
    const taken = new Set(
      rows
        .filter((r, i) => i !== index && r.product_id === self.product_id)
        .map((r) => Number(r.qty)),
    );
    const original = q;
    while (taken.has(q)) q += 1;
    if (q !== original)
      form.setValue(`details.${index}.qty`, q, { shouldDirty: true });
  };

  if (isView) {
    const n = Number(qty) || 0;
    return (
      <span
        className={cn(
          "text-foreground text-xs font-semibold tabular-nums",
          n === 0 && "text-muted-foreground italic",
        )}
      >
        {n || "—"}
      </span>
    );
  }
  const reg = form.register(`details.${index}.qty`, { valueAsNumber: true });
  return (
    <FieldInput
      type="number"
      inputMode="decimal"
      min={0}
      disabled={isDisabled}
      placeholder="0"
      error={errors?.qty?.message}
      className="border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums"
      {...reg}
      onBlur={(e) => {
        reg.onBlur(e);
        dedupeQty();
      }}
    />
  );
}

export function NoteCell({
  form,
  index,
  isView,
  isDisabled,
  placeholder,
}: CellProps & { readonly placeholder: string }) {
  "use no memo";
  const note = useWatch({
    control: form.control,
    name: `details.${index}.note`,
  });
  if (isView) return <FieldPlainText>{note}</FieldPlainText>;
  return (
    <Input
      type="text"
      disabled={isDisabled}
      placeholder={placeholder}
      maxLength={256}
      className="border-border/60 h-8 w-full rounded-md text-xs"
      {...form.register(`details.${index}.note`)}
    />
  );
}
