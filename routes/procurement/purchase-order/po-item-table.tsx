import { memo, useEffect, useMemo } from "react";
import {
  Controller,
  useFormState,
  useWatch,
  type UseFormReturn,
  type Control,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import {
  PO_ITEM_STATUS_CONFIG,
  normalizePoItemStatus,
} from "@/constant/purchase-order";
import type { PoFormValues } from "./po-form-schema";

/**
 * Read-only display ของชื่อสินค้า — watch แค่ 2 field (name, description)
 * ไม่แตะ `items` array ทั้งก้อน จึงไม่ re-render ตอน field อื่นเปลี่ยน
 */
const ProductCellDisplay = memo(function ProductCellDisplay({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  return (
    <NameWithSubtext primary={productName} secondary={productLocalName} />
  );
});

/**
 * Editable product lookup — watch `items` ทั้งก้อนเพื่อสร้าง excludeIds
 * (กันเลือกสินค้าซ้ำ) เฉพาะตอนแก้ไขเท่านั้น
 */
const ProductCellEditable = memo(function ProductCellEditable({
  control,
  form,
  index,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const allItems = useWatch({ control, name: "items" });
  const excludeIds = useMemo(
    () =>
      (allItems ?? [])
        .map((it, i) => (i === index ? null : it?.product_id))
        .filter((id): id is string => !!id),
    [allItems, index],
  );

  return (
    <Controller
      control={control}
      name={`items.${index}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProduct
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(`items.${index}.product_name`, product.name);
              form.setValue(`items.${index}.description`, product.name);
              form.setValue(
                `items.${index}.product_local_name`,
                product.local_name ?? "",
              );
              form.setValue(`items.${index}.product_code`, product.code ?? "");
              form.setValue(
                `items.${index}.product_sku`,
                (product as unknown as { sku?: string }).sku ?? "",
              );
              form.setValue(
                `items.${index}.base_unit_id`,
                product.inventory_unit?.id ?? null,
              );
              form.setValue(
                `items.${index}.base_unit_name`,
                product.inventory_unit?.name ?? "",
              );
              form.setValue(
                `items.${index}.order_unit_id`,
                product.inventory_unit?.id ?? "",
              );
              form.setValue(
                `items.${index}.order_unit_name`,
                product.inventory_unit?.name ?? "",
              );
              form.setValue(`items.${index}.order_unit_conversion_factor`, 1);
            }
          }}
          excludeIds={excludeIds}
          className="h-7 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

export const ProductCell = function ProductCell({
  control,
  form,
  index,
  disabled,
  readOnly = false,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly?: boolean;
}) {
  "use no memo";
  if (disabled || readOnly) {
    return <ProductCellDisplay control={control} index={index} />;
  }
  return <ProductCellEditable control={control} form={form} index={index} />;
};

export const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  form,
  index,
  disabled,
  readOnly = false,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly?: boolean;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";

  if (disabled || readOnly) {
    const unitName = form.getValues(`items.${index}.order_unit_name`) ?? "";
    return <span className="text-xs">{unitName || "—"}</span>;
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.order_unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(`items.${index}.order_unit_name`, unit.name);
            form.setValue(
              `items.${index}.order_unit_conversion_factor`,
              unit.conversion,
            );
          }}
          disabled={disabled || !productId}
          className="h-7 w-full text-xs"
        />
      )}
    />
  );
});

export const TaxProfileCell = memo(function TaxProfileCell({
  control,
  form,
  index,
  disabled,
  readOnly = false,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly?: boolean;
}) {
  "use no memo";
  if (disabled || readOnly) {
    const taxRate = form.getValues(`items.${index}.tax_rate`) ?? 0;
    return <span className="text-xs tabular-nums">{`${taxRate}%`}</span>;
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.tax_profile_id`}
      render={({ field, fieldState }) => (
        <LookupTaxProfile
          value={field.value ?? ""}
          onValueChange={(value, rate) => {
            field.onChange(value || null);
            form.setValue(`items.${index}.tax_rate`, rate);
          }}
          disabled={disabled}
          className="h-7 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

export const StatusCell = memo(function StatusCell({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const rawStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ||
    "pending";
  const status = normalizePoItemStatus(rawStatus);
  const config = PO_ITEM_STATUS_CONFIG[status] ?? PO_ITEM_STATUS_CONFIG.pending;
  return (
    <Badge className={`text-xs ${config.className}`}>{config.label}</Badge>
  );
});

function computeItemPricing(item: PoFormValues["items"][number] | undefined) {
  const price = Number(item?.price ?? 0);
  const orderQty = (item?.locations ?? []).reduce(
    (acc, l) => acc + (Number(l?.order_qty) || 0),
    0,
  );
  const taxRate = Number(item?.tax_rate ?? 0);
  const discRate = Number(item?.discount_rate ?? 0);
  const conversion = Number(item?.order_unit_conversion_factor ?? 1);

  const subtotal = round2(price * orderQty);
  const discountAmount = round2((subtotal * discRate) / 100);
  const netAmount = round2(subtotal - discountAmount);
  const taxAmount = round2((netAmount * taxRate) / 100);
  const totalPrice = round2(netAmount + taxAmount);
  const baseQty = round2(orderQty * conversion);

  return {
    orderQty,
    subtotal,
    discountAmount,
    netAmount,
    taxAmount,
    totalPrice,
    baseQty,
  };
}

/** Read-only display ของ order qty (= sum locations.order_qty) */
export const OrderQtyCell = function OrderQtyCell({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const locations =
    useWatch({ control, name: `items.${index}.locations` }) ?? [];
  // order_qty ระดับ item = ยอดรวมจาก locations (read-only) — ถ้า zod validate
  // แล้วยอดรวมไม่ผ่าน (min qty) จะไม่มี input ให้ scroll หา → mark data-invalid
  // + สีแดงที่เซลล์นี้ ให้ scrollToFirstInvalidField เจอ + user เห็น field ที่ผิด
  const { errors } = useFormState({
    control,
    name: `items.${index}.order_qty`,
  });
  const invalid = !!errors.items?.[index]?.order_qty;
  const sum = locations.reduce(
    (acc, l) => acc + (Number(l?.order_qty) || 0),
    0,
  );
  return (
    <span
      data-invalid={invalid ? "true" : undefined}
      className={cn(
        "tabular-nums",
        invalid && "text-destructive font-semibold",
      )}
    >
      {sum}
    </span>
  );
};

/** Read-only display ของ net/tax/total — คำนวณ local เพื่อแสดงผล (ไม่เขียน form) */
export const ComputedPricingCell = function ComputedPricingCell({
  control,
  index,
  field: displayField,
}: {
  control: Control<PoFormValues>;
  index: number;
  field: "net_amount" | "tax_amount" | "total_price";
}) {
  "use no memo";
  const item = useWatch({ control, name: `items.${index}` });
  const { netAmount, taxAmount, totalPrice } = computeItemPricing(item);
  const values = {
    net_amount: netAmount,
    tax_amount: taxAmount,
    total_price: totalPrice,
  };
  return (
    <span className="tabular-nums">{formatCurrency(values[displayField])}</span>
  );
};

/**
 * เขียน derived fields (order_qty mirror + pricing + base_qty) กลับเข้า form
 * เพื่อให้ payload (mapItemToPayload) และ summary อ่านได้
 *
 * Render-null — ติดตั้ง 1 ตัวต่อ item ที่ระดับ grid (ไม่ซ้ำ desktop/mobile)
 * จึงรัน setValue ครั้งเดียวต่อ item แทนที่จะซ้ำใน ItemRow + ItemCard
 */
export const PoItemComputedSync = memo(function PoItemComputedSync({
  control,
  form,
  index,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const item = useWatch({ control, name: `items.${index}` });
  const {
    orderQty,
    subtotal,
    discountAmount,
    netAmount,
    taxAmount,
    totalPrice,
    baseQty,
  } = computeItemPricing(item);

  useEffect(() => {
    form.setValue(`items.${index}.order_qty`, orderQty);
    form.setValue(`items.${index}.sub_total_price`, subtotal);
    form.setValue(`items.${index}.discount_amount`, discountAmount);
    form.setValue(`items.${index}.net_amount`, netAmount);
    form.setValue(`items.${index}.tax_amount`, taxAmount);
    form.setValue(`items.${index}.total_price`, totalPrice);
    form.setValue(`items.${index}.base_qty`, baseQty);
  }, [
    form,
    index,
    orderQty,
    subtotal,
    discountAmount,
    netAmount,
    taxAmount,
    totalPrice,
    baseQty,
  ]);

  return null;
});
