"use no memo";

import { memo } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency-utils";
import { ProductCell, StatusCell } from "./po-item-table";
import type { PoFormValues } from "./po-form-schema";

interface CellProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

/**
 * Inline unit-price input cell — number, right-align, mono
 *
 * Uses `form.setValue` ตรง ๆ ใน onChange แทน register's onChange
 * เพราะ RHF v7 + React Compiler + memo() ทำให้ `valueAsNumber: true`
 * ไม่ commit value ลง form state (debug 2026-05-29)
 */
export const PriceCell = memo(function PriceCell({
  form,
  index,
  disabled,
  readOnly,
}: CellProps) {
  const price =
    useWatch({ control: form.control, name: `items.${index}.price` }) ?? 0;
  if (disabled || readOnly) {
    return <span className="tabular-nums">{formatCurrency(price)}</span>;
  }
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      placeholder="0.00"
      className="h-7 text-right tabular-nums"
      disabled={disabled}
      defaultValue={price}
      {...form.register(`items.${index}.price`)}
      onChange={(e) => {
        const n = e.target.valueAsNumber;
        form.setValue(`items.${index}.price`, Number.isNaN(n) ? 0 : n, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }}
    />
  );
});

/** Inline discount-percent cell — 0-100, right-align */
export const DiscountRateCell = memo(function DiscountRateCell({
  form,
  index,
  disabled,
  readOnly,
}: CellProps) {
  const rate =
    useWatch({
      control: form.control,
      name: `items.${index}.discount_rate`,
    }) ?? 0;
  if (disabled || readOnly) {
    return <span className="tabular-nums">{rate}%</span>;
  }
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      max={100}
      step="0.01"
      placeholder="0"
      className="h-7 text-right tabular-nums"
      disabled={disabled}
      defaultValue={rate}
      {...form.register(`items.${index}.discount_rate`)}
      onChange={(e) => {
        const n = e.target.valueAsNumber;
        form.setValue(`items.${index}.discount_rate`, Number.isNaN(n) ? 0 : n, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }}
    />
  );
});

interface ProductHeaderCellProps extends CellProps {
  readonly isFoc: boolean;
  readonly showStatusBadge: boolean;
}

/**
 * Product cell — name (ProductCell) + FOC/Status badges + local name + code/SKU
 *
 * Font ของทุก line ใช้ inherit จาก parent (`text-xs` บน table) — ไม่ override
 */
export function ProductHeaderCell({
  form,
  index,
  disabled,
  readOnly,
  isFoc,
  showStatusBadge,
}: ProductHeaderCellProps) {
  const productLocalName =
    useWatch({
      control: form.control,
      name: `items.${index}.product_local_name`,
    }) ?? "";
  const productCode =
    useWatch({
      control: form.control,
      name: `items.${index}.product_code`,
    }) ?? "";
  const productSku =
    useWatch({
      control: form.control,
      name: `items.${index}.product_sku`,
    }) ?? "";

  // Edit mode (editable) → ซ่อน local name + code/SKU meta — เหลือเฉพาะ lookup
  const isEditing = !disabled && !readOnly;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <ProductCell
            control={form.control}
            form={form}
            index={index}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>
        {isFoc && (
          <Badge variant="success-light" size="xs">
            FOC
          </Badge>
        )}
        {showStatusBadge && <StatusCell control={form.control} index={index} />}
      </div>
      {!isEditing && productLocalName && (
        <p className="text-muted-foreground truncate">{productLocalName}</p>
      )}
      {!isEditing && (productCode || productSku) && (
        <p className="text-muted-foreground/80 mt-0.5 truncate">
          {productCode}
          {productSku ? ` · SKU ${productSku}` : ""}
        </p>
      )}
    </div>
  );
}
